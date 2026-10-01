import { beforeEach, describe, expect, it } from "vitest";

import { FixedClock } from "../../shared/testing/fixed-clock";
import { SequentialIdGenerator } from "../../shared/testing/sequential-id-generator";
import { blankQuestion } from "../domain/question";
import {
	QUIZ_MAX_QUESTIONS,
	QuestionLimitReachedError,
	QuestionNotFoundError,
} from "../domain/question-list";
import { aQuestion, asQuiz, aTrueFalseQuestion } from "../testing/a-question";
import { aQuiz } from "../testing/a-quiz";
import { InMemoryQuestionRepository } from "../testing/in-memory-question-repository";
import { InMemoryQuizRepository } from "../testing/in-memory-quiz-repository";
import { InMemoryQuizVersionRepository } from "../testing/in-memory-quiz-version-repository";
import {
	createDuplicateQuestion,
	type DuplicateQuestion,
} from "./duplicate-question";

describe("duplicateQuestion", () => {
	let quizzes: InMemoryQuizRepository;
	let questions: InMemoryQuestionRepository;
	let clock: FixedClock;
	let duplicateQuestion: DuplicateQuestion;
	const ref = { ownerId: "user-1", quizId: "quiz-1" };
	/** Every field set, so the copy proves it keeps them (spec 004, CA-15). */
	const a = aQuestion({
		id: "a",
		text: "Capital da França?",
		selection: "multiple",
		timeLimitSeconds: 45,
		points: "double",
		choices: [
			{ id: "choice-1", text: "Paris", correct: true },
			{ id: "choice-2", text: "Lyon", correct: false },
			{ id: "choice-3", text: "Paris (FR)", correct: true },
			{ id: "choice-4", text: null, correct: false },
			{ id: "choice-5", text: "Nice", correct: false },
			{ id: "choice-6", text: null, correct: false },
		],
	});
	const b = aQuestion({ id: "b", text: "B" });

	beforeEach(async () => {
		quizzes = new InMemoryQuizRepository();
		questions = new InMemoryQuestionRepository();
		clock = new FixedClock("2026-06-01T12:00:00.000Z");
		duplicateQuestion = createDuplicateQuestion({
			quizzes,
			questions,
			versions: new InMemoryQuizVersionRepository(),
			ids: new SequentialIdGenerator("copy"),
			clock,
		});
		await quizzes.save(aQuiz());
		await questions.saveList("quiz-1", [a, b]);
	});

	it("places the copy right after the original under a new id", async () => {
		const result = await duplicateQuestion({ ...ref, questionId: "a" });

		expect(result).toEqual({
			question: { ...a, id: "copy-1" },
			index: 1,
		});
		expect(questions.listOf("quiz-1").map(({ id }) => id)).toEqual([
			"a",
			"copy-1",
			"b",
		]);
		expect((await quizzes.findById("quiz-1"))?.updatedAt).toEqual(clock.now());
	});

	it("the copy is independent of the original", async () => {
		await duplicateQuestion({ ...ref, questionId: "a" });

		const copy = asQuiz(questions.listOf("quiz-1")[1]);
		copy.choices[0] = { id: "choice-1", text: "Mudou", correct: false };
		await questions.saveQuestion("quiz-1", { ...copy, text: "Outra" });

		expect(questions.listOf("quiz-1")[0]).toEqual(a);
	});

	it("copies a true/false question with its correct answer", async () => {
		const statement = aTrueFalseQuestion({
			id: "tf",
			correct: true,
			timeLimitSeconds: 10,
			points: "noPoints",
		});
		await questions.saveList("quiz-1", [statement, b]);

		const result = await duplicateQuestion({ ...ref, questionId: "tf" });

		expect(result.question).toEqual({ ...statement, id: "copy-1" });
		expect(questions.listOf("quiz-1")[1]).toEqual({
			...statement,
			id: "copy-1",
		});
	});

	it("refuses a question that is not in the quiz", async () => {
		await expect(
			duplicateQuestion({ ...ref, questionId: "missing" }),
		).rejects.toThrow(QuestionNotFoundError);
	});

	it("refuses to duplicate at the limit", async () => {
		const full = Array.from({ length: QUIZ_MAX_QUESTIONS }, (_, index) =>
			blankQuestion(`q-${index}`),
		);
		await questions.saveList("quiz-1", full);

		await expect(
			duplicateQuestion({ ...ref, questionId: "q-0" }),
		).rejects.toThrow(QuestionLimitReachedError);
	});
});
