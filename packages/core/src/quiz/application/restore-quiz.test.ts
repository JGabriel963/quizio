import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { QuizNotFoundError } from "../domain/quiz";
import { aQuiz } from "../testing/a-quiz";
import { InMemoryQuizRepository } from "../testing/in-memory-quiz-repository";
import { createRestoreQuiz, type RestoreQuiz } from "./restore-quiz";

describe("restoreQuiz", () => {
	const original = aQuiz({
		coverImageKey: "media/user-1/cover.png",
		visibility: "unlisted",
	});
	let quizzes: InMemoryQuizRepository;
	let restoreQuiz: RestoreQuiz;

	beforeEach(() => {
		quizzes = new InMemoryQuizRepository();
		restoreQuiz = createRestoreQuiz({
			quizzes,
			storage: new InMemoryObjectStorage("https://media.test"),
		});
	});

	it("restores every field including updatedAt", async () => {
		await quizzes.save({
			...original,
			trashedAt: new Date("2026-05-01T00:00:00.000Z"),
		});

		const view = await restoreQuiz({ ownerId: "user-1", quizId: "quiz-1" });

		expect(view.trashedAt).toBeNull();
		expect(await quizzes.findById("quiz-1")).toEqual(original);
	});

	it("is idempotent", async () => {
		await quizzes.save(original);

		await restoreQuiz({ ownerId: "user-1", quizId: "quiz-1" });

		expect(await quizzes.findById("quiz-1")).toEqual(original);
	});

	it("treats another owner's quiz as not found", async () => {
		await quizzes.save({ ...original, trashedAt: new Date() });

		await expect(
			restoreQuiz({ ownerId: "user-2", quizId: "quiz-1" }),
		).rejects.toThrow(QuizNotFoundError);
	});
});
