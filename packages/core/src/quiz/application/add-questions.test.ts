import { beforeEach, describe, expect, it } from "vitest";

import { FixedClock } from "../../shared/testing/fixed-clock";
import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { SequentialIdGenerator } from "../../shared/testing/sequential-id-generator";
import { blankQuestion } from "../domain/question";
import { InvalidQuestionImageError } from "../domain/question-image";
import {
	QUIZ_MAX_QUESTIONS,
	QuestionLimitReachedError,
} from "../domain/question-list";
import { QuizNotFoundError } from "../domain/quiz";
import { newQuizVersion } from "../domain/quiz-version";
import { aQuestion } from "../testing/a-question";
import { aPublishedQuiz, aQuiz } from "../testing/a-quiz";
import { InMemoryQuestionRepository } from "../testing/in-memory-question-repository";
import { InMemoryQuizRepository } from "../testing/in-memory-quiz-repository";
import { InMemoryQuizVersionRepository } from "../testing/in-memory-quiz-version-repository";
import { type AddQuestions, createAddQuestions } from "./add-questions";

describe("addQuestions (spec 044, RN-21, RN-22)", () => {
	let quizzes: InMemoryQuizRepository;
	let questions: InMemoryQuestionRepository;
	let versions: InMemoryQuizVersionRepository;
	let storage: InMemoryObjectStorage;
	let add: AddQuestions;
	const ref = { ownerId: "user-1", quizId: "quiz-1" };
	const draft = (text: string) => ({ type: "trueFalse", text, correct: true });

	beforeEach(async () => {
		quizzes = new InMemoryQuizRepository();
		questions = new InMemoryQuestionRepository();
		versions = new InMemoryQuizVersionRepository();
		storage = new InMemoryObjectStorage("https://media.test");
		add = createAddQuestions({
			quizzes,
			questions,
			versions,
			storage,
			ids: new SequentialIdGenerator("added"),
			clock: new FixedClock("2026-10-28T12:00:00.000Z"),
		});
		await quizzes.save(aQuiz());
		await questions.saveList("quiz-1", [
			aQuestion({ id: "a" }),
			aQuestion({ id: "b" }),
		]);
	});

	const ids = () => questions.listOf("quiz-1").map(({ id }) => id);

	it("inserts the drafts after the given question, or at the end", async () => {
		const result = await add({
			...ref,
			afterQuestionId: "a",
			questions: [draft("Um"), draft("Dois")],
		});
		expect(ids()).toEqual(["a", "added-1", "added-2", "b"]);
		expect(result.firstIndex).toBe(1);
		expect(result.questions.map((question) => question.aiGenerated)).toEqual([
			true,
			true,
		]);

		await add({ ...ref, afterQuestionId: null, questions: [draft("Três")] });
		expect(ids()).toEqual(["a", "added-1", "added-2", "b", "added-3"]);
	});

	it("replaces the lone blank question", async () => {
		await questions.saveList("quiz-1", [blankQuestion("blank")]);

		await add({ ...ref, afterQuestionId: null, questions: [draft("Um")] });

		expect(ids()).toEqual(["added-1"]);
	});

	it("refuses going past 200 questions and writes nothing", async () => {
		await expect(
			add({
				...ref,
				afterQuestionId: null,
				questions: Array.from({ length: QUIZ_MAX_QUESTIONS - 1 }, (_, i) =>
					draft(`Pergunta ${i}`),
				),
			}),
		).rejects.toBeInstanceOf(QuestionLimitReachedError);
		expect(ids()).toEqual(["a", "b"]);
	});

	it("refuses an image key that is not the owner's media", async () => {
		storage.simulateUpload("media/user-2/img.png");
		storage.simulateUpload("media/user-1/img.png");

		await expect(
			add({
				...ref,
				afterQuestionId: null,
				questions: [{ ...draft("?"), image: { key: "media/user-2/img.png" } }],
			}),
		).rejects.toBeInstanceOf(InvalidQuestionImageError);
		expect(ids()).toEqual(["a", "b"]);

		await add({
			...ref,
			afterQuestionId: null,
			questions: [{ ...draft("?"), image: { key: "media/user-1/img.png" } }],
		});
		expect(questions.listOf("quiz-1")[2]?.image?.key).toBe(
			"media/user-1/img.png",
		);
	});

	it("marks the quiz edited, so a published quiz shows unpublished changes", async () => {
		await quizzes.save(aPublishedQuiz());
		await versions.save(
			newQuizVersion({
				quizId: "quiz-1",
				number: 1,
				questions: questions.listOf("quiz-1"),
				now: new Date("2026-10-01T00:00:00.000Z"),
			}),
		);

		await add({ ...ref, afterQuestionId: null, questions: [draft("Nova")] });

		expect((await quizzes.findById("quiz-1"))?.hasUnpublishedChanges).toBe(
			true,
		);
	});

	it("someone else's quiz is not found", async () => {
		await expect(
			add({
				ownerId: "user-2",
				quizId: "quiz-1",
				afterQuestionId: null,
				questions: [draft("?")],
			}),
		).rejects.toBeInstanceOf(QuizNotFoundError);
	});
});
