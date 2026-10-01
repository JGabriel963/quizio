import { beforeEach, describe, expect, it } from "vitest";

import { FixedClock } from "../../shared/testing/fixed-clock";
import { SequentialIdGenerator } from "../../shared/testing/sequential-id-generator";
import { blankQuestion, InvalidQuestionTypeError } from "../domain/question";
import {
	QUIZ_MAX_QUESTIONS,
	QuestionLimitReachedError,
} from "../domain/question-list";
import { aQuestion } from "../testing/a-question";
import { aQuiz } from "../testing/a-quiz";
import { InMemoryQuestionRepository } from "../testing/in-memory-question-repository";
import { InMemoryQuizRepository } from "../testing/in-memory-quiz-repository";
import { InMemoryQuizVersionRepository } from "../testing/in-memory-quiz-version-repository";
import { type AddQuestion, createAddQuestion } from "./add-question";

describe("addQuestion", () => {
	let quizzes: InMemoryQuizRepository;
	let questions: InMemoryQuestionRepository;
	let clock: FixedClock;
	let addQuestion: AddQuestion;
	const ref = { ownerId: "user-1", quizId: "quiz-1" };

	beforeEach(async () => {
		quizzes = new InMemoryQuizRepository();
		questions = new InMemoryQuestionRepository();
		clock = new FixedClock("2026-06-01T12:00:00.000Z");
		addQuestion = createAddQuestion({
			quizzes,
			questions,
			versions: new InMemoryQuizVersionRepository(),
			ids: new SequentialIdGenerator("new"),
			clock,
		});
		await quizzes.save(aQuiz());
		await questions.saveList("quiz-1", [
			aQuestion({ id: "a" }),
			aQuestion({ id: "b" }),
			aQuestion({ id: "c" }),
		]);
	});

	const storedIds = () => questions.listOf("quiz-1").map(({ id }) => id);

	it("adds a blank question right after the selected one", async () => {
		const result = await addQuestion({
			...ref,
			afterQuestionId: "b",
			type: "quiz",
		});

		expect(result).toEqual({
			question: blankQuestion("new-1"),
			index: 2,
		});
		expect(storedIds()).toEqual(["a", "b", "new-1", "c"]);
	});

	it("adds a blank true/false question after the selected one", async () => {
		const result = await addQuestion({
			...ref,
			afterQuestionId: "a",
			type: "trueFalse",
		});

		expect(result).toEqual({
			question: blankQuestion("new-1", "trueFalse"),
			index: 1,
		});
		expect(questions.listOf("quiz-1")[1]).toEqual({
			id: "new-1",
			type: "trueFalse",
			text: null,
			timeLimitSeconds: 20,
			points: "standard",
			image: null,
			correct: null,
		});
	});

	it("refuses an unknown type", async () => {
		await expect(
			addQuestion({ ...ref, afterQuestionId: "a", type: "slider" }),
		).rejects.toThrow(InvalidQuestionTypeError);
		expect(storedIds()).toEqual(["a", "b", "c"]);
	});

	it("adds at the end when nothing is selected", async () => {
		const result = await addQuestion({
			...ref,
			afterQuestionId: null,
			type: "quiz",
		});

		expect(result.index).toBe(3);
		expect(storedIds()).toEqual(["a", "b", "c", "new-1"]);
	});

	it("touches the quiz's updatedAt", async () => {
		await addQuestion({ ...ref, afterQuestionId: "a", type: "quiz" });

		expect((await quizzes.findById("quiz-1"))?.updatedAt).toEqual(clock.now());
	});

	it("never overwrites a quiz change made while the question was being added", async () => {
		// Autosave of the title lands between loading the quiz and marking it edited.
		const racingQuestions = new InMemoryQuestionRepository();
		await racingQuestions.saveList("quiz-1", [aQuestion({ id: "a" })]);
		const originalSaveList = racingQuestions.saveList.bind(racingQuestions);
		racingQuestions.saveList = async (quizId, list) => {
			await originalSaveList(quizId, list);
			const quiz = await quizzes.findById(quizId);
			if (quiz) {
				await quizzes.save({ ...quiz, title: "Renomeado durante a adição" });
			}
		};
		const racingAdd = createAddQuestion({
			quizzes,
			questions: racingQuestions,
			versions: new InMemoryQuizVersionRepository(),
			ids: new SequentialIdGenerator("new"),
			clock,
		});

		await racingAdd({ ...ref, afterQuestionId: "a", type: "quiz" });

		const quiz = await quizzes.findById("quiz-1");
		expect(quiz?.title).toBe("Renomeado durante a adição");
		expect(quiz?.updatedAt).toEqual(clock.now());
	});

	it("refuses the 201st question", async () => {
		const full = Array.from({ length: QUIZ_MAX_QUESTIONS }, (_, index) =>
			blankQuestion(`q-${index}`),
		);
		await questions.saveList("quiz-1", full);

		await expect(
			addQuestion({ ...ref, afterQuestionId: null, type: "quiz" }),
		).rejects.toThrow(QuestionLimitReachedError);
		expect(questions.listOf("quiz-1")).toHaveLength(QUIZ_MAX_QUESTIONS);
	});
});
