import { beforeEach, describe, expect, it } from "vitest";

import { characterCount } from "../../shared/domain/text-length";
import { FixedClock } from "../../shared/testing/fixed-clock";
import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { SequentialIdGenerator } from "../../shared/testing/sequential-id-generator";
import { QuizInTrashError, QuizNotFoundError } from "../domain/quiz";
import { aQuiz } from "../testing/a-quiz";
import { InMemoryQuizRepository } from "../testing/in-memory-quiz-repository";
import { createDuplicateQuiz, type DuplicateQuiz } from "./duplicate-quiz";

const COVER = "media/user-1/cover.png";

describe("duplicateQuiz", () => {
	let quizzes: InMemoryQuizRepository;
	let storage: InMemoryObjectStorage;
	let clock: FixedClock;
	let duplicateQuiz: DuplicateQuiz;

	beforeEach(() => {
		quizzes = new InMemoryQuizRepository();
		storage = new InMemoryObjectStorage("https://media.test");
		clock = new FixedClock("2026-06-01T12:00:00.000Z");
		duplicateQuiz = createDuplicateQuiz({
			quizzes,
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
