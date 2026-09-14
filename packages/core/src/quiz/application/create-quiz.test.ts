import { beforeEach, describe, expect, it } from "vitest";

import { FixedClock } from "../../shared/testing/fixed-clock";
import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { SequentialIdGenerator } from "../../shared/testing/sequential-id-generator";
import { InvalidCoverImageError } from "../domain/quiz";
import { QuizTitleTooLongError } from "../domain/quiz-details";
import { InMemoryQuizRepository } from "../testing/in-memory-quiz-repository";
import { type CreateQuiz, createCreateQuiz } from "./create-quiz";

describe("createQuiz", () => {
	let quizzes: InMemoryQuizRepository;
	let storage: InMemoryObjectStorage;
	let clock: FixedClock;
	let createQuiz: CreateQuiz;

	beforeEach(() => {
		quizzes = new InMemoryQuizRepository();
		storage = new InMemoryObjectStorage("https://media.test");
		clock = new FixedClock("2026-06-01T12:00:00.000Z");
		createQuiz = createCreateQuiz({
			quizzes,
			storage,
			ids: new SequentialIdGenerator("quiz"),
			clock,
		});
	});

	it("creates a private draft with zero questions stamped now", async () => {
		const view = await createQuiz({
			ownerId: "user-1",
			title: "Bom de Bíblia (Junho)",
			description: "Atos 1 a 7",
		});

		expect(view).toEqual({
			id: "quiz-1",
			title: "Bom de Bíblia (Junho)",
			description: "Atos 1 a 7",
			coverImageUrl: null,
			visibility: "private",
			status: "draft",
			questionCount: 0,
			createdAt: clock.now(),
			updatedAt: clock.now(),
			trashedAt: null,
		});
		expect(quizzes.all()).toEqual([
			expect.objectContaining({ id: "quiz-1", ownerId: "user-1" }),
		]);
	});

	it("stores an owned, uploaded cover", async () => {
		storage.simulateUpload("media/user-1/cover.png");

		const view = await createQuiz({
			ownerId: "user-1",
			coverImageKey: "media/user-1/cover.png",
		});

		expect(view.coverImageUrl).toBe(
			"https://media.test/media/user-1/cover.png",
		);
	});

	it.each([
		["another owner's upload", "media/user-2/cover.png"],
		["a missing upload", "media/user-1/missing.png"],
	])("rejects %s without creating the quiz", async (_, coverImageKey) => {
		storage.simulateUpload("media/user-2/cover.png");

		await expect(
			createQuiz({ ownerId: "user-1", coverImageKey }),
		).rejects.toThrow(InvalidCoverImageError);
		expect(quizzes.all()).toHaveLength(0);
	});

	it("rejects titles above the limit without creating the quiz", async () => {
		await expect(
			createQuiz({ ownerId: "user-1", title: "a".repeat(96) }),
		).rejects.toThrow(QuizTitleTooLongError);
		expect(quizzes.all()).toHaveLength(0);
	});
});
