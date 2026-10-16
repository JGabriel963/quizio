import { beforeEach, describe, expect, it } from "vitest";

import { FixedClock } from "../../shared/testing/fixed-clock";
import { SequentialIdGenerator } from "../../shared/testing/sequential-id-generator";
import { InvalidGeneratedQuestionError } from "../domain/accept-generated";
import { blankQuestion, QuestionTextTooLongError } from "../domain/question";
import {
	QUIZ_MAX_QUESTIONS,
	QuestionLimitReachedError,
} from "../domain/question-list";
import { QuizInTrashError, QuizNotFoundError } from "../domain/quiz";
import { newQuizVersion } from "../domain/quiz-version";
import { aQuestion } from "../testing/a-question";
import { aPublishedQuiz, aQuiz } from "../testing/a-quiz";
import { aGeneratedDraft } from "../testing/in-memory-question-generator";
import { InMemoryQuestionRepository } from "../testing/in-memory-question-repository";
import { InMemoryQuizRepository } from "../testing/in-memory-quiz-repository";
import { InMemoryQuizVersionRepository } from "../testing/in-memory-quiz-version-repository";
import {
	type AddGeneratedQuestions,
	createAddGeneratedQuestions,
} from "./add-generated-questions";

describe("addGeneratedQuestions", () => {
	let quizzes: InMemoryQuizRepository;
	let questions: InMemoryQuestionRepository;
	let versions: InMemoryQuizVersionRepository;
	let clock: FixedClock;
	let add: AddGeneratedQuestions;
	const ref = { ownerId: "user-1", quizId: "quiz-1" };

	beforeEach(async () => {
		quizzes = new InMemoryQuizRepository();
		questions = new InMemoryQuestionRepository();
		versions = new InMemoryQuizVersionRepository();
		clock = new FixedClock("2026-10-16T10:00:00.000Z");
		add = createAddGeneratedQuestions({
			quizzes,
			questions,
			versions,
			ids: new SequentialIdGenerator("added"),
			clock,
		});
		await quizzes.save(aQuiz());
		await questions.saveList("quiz-1", [aQuestion({ id: "a" })]);
	});

	const stored = () => questions.listOf("quiz-1");

	it("appends after the existing questions, marked as AI", async () => {
		const result = await add({
			...ref,
			questions: [aGeneratedDraft(1), aGeneratedDraft(2)],
		});

		expect(stored().map(({ id }) => id)).toEqual(["a", "added-1", "added-2"]);
		expect(stored()[1]).toMatchObject({
			text: "Pergunta 1 sobre o sistema solar?",
			aiGenerated: true,
		});
		expect(stored()[0]?.aiGenerated).toBe(false);
		expect(result.firstIndex).toBe(1);
		expect(result.questions.map(({ id }) => id)).toEqual([
			"added-1",
			"added-2",
		]);
	});

	it("replaces the blank question of a new quiz", async () => {
		await questions.saveList("quiz-1", [blankQuestion("blank")]);

		const result = await add({ ...ref, questions: [aGeneratedDraft()] });

		expect(stored().map(({ id }) => id)).toEqual(["added-1"]);
		expect(result.firstIndex).toBe(0);
	});

	it("gives every added question a new id", async () => {
		await add({ ...ref, questions: [aGeneratedDraft(), aGeneratedDraft()] });

		expect(new Set(stored().map(({ id }) => id)).size).toBe(3);
	});

	it("revalidates the questions the client sends back", async () => {
		await expect(
			add({
				...ref,
				questions: [{ ...aGeneratedDraft(), text: "a".repeat(161) }],
			}),
		).rejects.toThrow(QuestionTextTooLongError);
		await expect(
			add({
				...ref,
				questions: [
					{
						type: "quiz",
						text: "Sem correta?",
						choices: [
							{ text: "A", correct: false },
							{ text: "B", correct: false },
						],
					},
				],
			}),
		).rejects.toThrow(InvalidGeneratedQuestionError);
		expect(stored()).toHaveLength(1);
	});

	it("refuses past 200 questions", async () => {
		await questions.saveList(
			"quiz-1",
			Array.from({ length: QUIZ_MAX_QUESTIONS - 1 }, (_, index) =>
				aQuestion({ id: `q-${index}` }),
			),
		);

		await expect(
			add({ ...ref, questions: [aGeneratedDraft(), aGeneratedDraft()] }),
		).rejects.toThrow(QuestionLimitReachedError);
		await add({ ...ref, questions: [aGeneratedDraft()] });
		expect(stored()).toHaveLength(QUIZ_MAX_QUESTIONS);
	});

	it("adding marks a published quiz as changed", async () => {
		await quizzes.save(aPublishedQuiz());
		await versions.save(
			newQuizVersion({
				quizId: "quiz-1",
				number: 1,
				questions: stored(),
				now: clock.now(),
			}),
		);

		await add({ ...ref, questions: [aGeneratedDraft()] });

		const quiz = await quizzes.findById("quiz-1");
		expect(quiz?.hasUnpublishedChanges).toBe(true);
		expect(quiz?.updatedAt).toEqual(clock.now());
	});

	it("another owner's quiz is not found", async () => {
		await expect(
			add({ ...ref, ownerId: "user-2", questions: [aGeneratedDraft()] }),
		).rejects.toThrow(QuizNotFoundError);
	});

	it("a trashed quiz refuses", async () => {
		await quizzes.save(aQuiz({ trashedAt: clock.now() }));

		await expect(
			add({ ...ref, questions: [aGeneratedDraft()] }),
		).rejects.toThrow(QuizInTrashError);
	});
});
