import { beforeEach, describe, expect, it } from "vitest";
import { characterCount } from "../../shared/domain/text-length";
import { FixedClock } from "../../shared/testing/fixed-clock";
import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { SequentialIdGenerator } from "../../shared/testing/sequential-id-generator";
import { blankQuestion } from "../domain/question";
import { QuizInTrashError, QuizNotFoundError } from "../domain/quiz";
import { aQuestion, aTrueFalseQuestion } from "../testing/a-question";
import { aPublishedQuiz, aQuiz } from "../testing/a-quiz";
import { InMemoryQuestionRepository } from "../testing/in-memory-question-repository";
import { InMemoryQuizRepository } from "../testing/in-memory-quiz-repository";
import { createDuplicateQuiz, type DuplicateQuiz } from "./duplicate-quiz";

const COVER = "media/user-1/cover.png";

describe("duplicateQuiz", () => {
	let quizzes: InMemoryQuizRepository;
	let questions: InMemoryQuestionRepository;
	let storage: InMemoryObjectStorage;
	let clock: FixedClock;
	let duplicateQuiz: DuplicateQuiz;

	beforeEach(() => {
		quizzes = new InMemoryQuizRepository();
		questions = new InMemoryQuestionRepository();
		storage = new InMemoryObjectStorage("https://media.test");
		clock = new FixedClock("2026-06-01T12:00:00.000Z");
		duplicateQuiz = createDuplicateQuiz({
			quizzes,
			questions,
			storage,
			ids: new SequentialIdGenerator("new"),
			clock,
		});
	});

	it("creates an independent draft copy with the cover copied to a new key", async () => {
		const original = aQuiz({ coverImageKey: COVER, visibility: "unlisted" });
		await quizzes.save(original);
		storage.simulateUpload(COVER);

		const copy = await duplicateQuiz({ ownerId: "user-1", quizId: "quiz-1" });

		expect(copy).toMatchObject({
			title: "Bom de Bíblia (Junho) (cópia)",
			description: "Atos 1 a 7",
			visibility: "unlisted",
			status: "draft",
			createdAt: clock.now(),
			updatedAt: clock.now(),
			trashedAt: null,
		});
		expect(copy.id).not.toBe("quiz-1");
		const copiedCover = storage.keys().find((key) => key !== COVER);
		expect(copiedCover).toMatch(/^media\/user-1\/.+\.png$/);
		expect(copy.coverImageUrl).toBe(`https://media.test/${copiedCover}`);
		expect(await quizzes.findById("quiz-1")).toEqual(original);
		expect(await quizzes.findById(copy.id)).toMatchObject({
			ownerId: "user-1",
			coverImageKey: copiedCover,
		});
	});

	it("copies quizzes without a cover without touching storage", async () => {
		await quizzes.save(aQuiz());

		const copy = await duplicateQuiz({ ownerId: "user-1", quizId: "quiz-1" });

		expect(copy.coverImageUrl).toBeNull();
		expect(storage.keys()).toEqual([]);
	});

	it("fits the copy title in 95 characters", async () => {
		await quizzes.save(aQuiz({ title: "a".repeat(95) }));

		const copy = await duplicateQuiz({ ownerId: "user-1", quizId: "quiz-1" });

		expect(characterCount(copy.title ?? "")).toBe(95);
		expect(copy.title?.endsWith(" (cópia)")).toBe(true);
	});

	it("copies the questions in order under new ids", async () => {
		await quizzes.save(aQuiz());
		await questions.saveList("quiz-1", [
			aQuestion({ id: "a", text: "A" }),
			aQuestion({ id: "b", text: "B" }),
		]);

		const copy = await duplicateQuiz({ ownerId: "user-1", quizId: "quiz-1" });

		expect(copy.questionCount).toBe(2);
		expect(questions.listOf(copy.id)).toEqual([
			aQuestion({ id: "new-2", text: "A" }),
			aQuestion({ id: "new-3", text: "B" }),
		]);
	});

	it("copies answers, corrects, selection, time and points", async () => {
		await quizzes.save(aQuiz());
		const original = aQuestion({
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
		await questions.saveList("quiz-1", [original]);

		const copy = await duplicateQuiz({ ownerId: "user-1", quizId: "quiz-1" });

		expect(questions.listOf(copy.id)).toEqual([{ ...original, id: "new-2" }]);
	});

	it("copies a true/false question with its correct answer", async () => {
		await quizzes.save(aQuiz());
		const statement = aTrueFalseQuestion({ id: "tf", correct: false });
		await questions.saveList("quiz-1", [statement]);

		const copy = await duplicateQuiz({ ownerId: "user-1", quizId: "quiz-1" });

		expect(questions.listOf(copy.id)).toEqual([{ ...statement, id: "new-2" }]);
	});

	it("editing a copied question leaves the original intact", async () => {
		await quizzes.save(aQuiz());
		const original = aQuestion({ id: "a", text: "A" });
		await questions.saveList("quiz-1", [original]);
		const copy = await duplicateQuiz({ ownerId: "user-1", quizId: "quiz-1" });
		const [copied = original] = questions.listOf(copy.id);

		await questions.saveQuestion(copy.id, { ...copied, text: "Mudou" });

		expect(questions.listOf("quiz-1")).toEqual([original]);
	});

	it("a source without questions yields a copy with one blank question", async () => {
		await quizzes.save(aQuiz());

		const copy = await duplicateQuiz({ ownerId: "user-1", quizId: "quiz-1" });

		expect(copy.questionCount).toBe(1);
		expect(questions.listOf(copy.id)).toEqual([blankQuestion("new-2")]);
	});

	it("a copy of a published quiz is a draft with the current questions", async () => {
		const original = aPublishedQuiz({ hasUnpublishedChanges: true });
		await quizzes.save(original);
		// The live list, with what changed after the version was saved.
		await questions.saveList("quiz-1", [aQuestion({ id: "a", text: "Mudou" })]);

		const copy = await duplicateQuiz({ ownerId: "user-1", quizId: "quiz-1" });

		expect(copy).toMatchObject({
			status: "draft",
			publishedVersion: null,
			publishedAt: null,
			hasUnpublishedChanges: false,
		});
		expect(questions.listOf(copy.id)).toEqual([
			aQuestion({ id: "new-2", text: "Mudou" }),
		]);
		expect(await quizzes.findById("quiz-1")).toEqual(original);
	});

	it("refuses quizzes in the trash", async () => {
		await quizzes.save(aQuiz({ trashedAt: new Date("2026-05-01T00:00:00Z") }));

		await expect(
			duplicateQuiz({ ownerId: "user-1", quizId: "quiz-1" }),
		).rejects.toThrow(QuizInTrashError);
		expect(quizzes.all()).toHaveLength(1);
	});

	it("treats another owner's quiz as not found", async () => {
		await quizzes.save(aQuiz({ ownerId: "user-2" }));

		await expect(
			duplicateQuiz({ ownerId: "user-1", quizId: "quiz-1" }),
		).rejects.toThrow(QuizNotFoundError);
	});
});
