import { beforeEach, describe, expect, it } from "vitest";

import { FixedClock } from "../../shared/testing/fixed-clock";
import { QuizNotFoundError } from "../domain/quiz";
import { aQuiz } from "../testing/a-quiz";
import { InMemoryQuizRepository } from "../testing/in-memory-quiz-repository";
import {
	createMoveQuizToTrash,
	type MoveQuizToTrash,
} from "./move-quiz-to-trash";

describe("moveQuizToTrash", () => {
	let quizzes: InMemoryQuizRepository;
	let clock: FixedClock;
	let moveQuizToTrash: MoveQuizToTrash;

	beforeEach(async () => {
		quizzes = new InMemoryQuizRepository();
		clock = new FixedClock("2026-06-01T12:00:00.000Z");
		moveQuizToTrash = createMoveQuizToTrash({ quizzes, clock });
		await quizzes.save(aQuiz());
	});

	it("moves the quiz to the trash without touching updatedAt", async () => {
		await moveQuizToTrash({ ownerId: "user-1", quizId: "quiz-1" });

		expect(await quizzes.findById("quiz-1")).toMatchObject({
			trashedAt: clock.now(),
			updatedAt: aQuiz().updatedAt,
		});
	});

	it("is idempotent", async () => {
		const firstTrashedAt = clock.now();
		await moveQuizToTrash({ ownerId: "user-1", quizId: "quiz-1" });
		clock.advanceBy(60_000);

		await moveQuizToTrash({ ownerId: "user-1", quizId: "quiz-1" });

		expect((await quizzes.findById("quiz-1"))?.trashedAt).toEqual(
			firstTrashedAt,
		);
	});

	it("treats another owner's quiz as not found", async () => {
		await expect(
			moveQuizToTrash({ ownerId: "user-2", quizId: "quiz-1" }),
		).rejects.toThrow(QuizNotFoundError);
		expect((await quizzes.findById("quiz-1"))?.trashedAt).toBeNull();
	});
});
