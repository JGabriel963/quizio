import { describe, expect, it } from "vitest";

import { newQuiz } from "../domain/quiz";
import { InMemoryQuizRepository } from "./in-memory-quiz-repository";

const quiz = newQuiz({
	id: "quiz-1",
	ownerId: "user-1",
	details: { title: "Bom de Bíblia", description: null, visibility: "private" },
	coverImageKey: null,
	now: new Date("2026-01-01T10:00:00.000Z"),
});

describe("InMemoryQuizRepository", () => {
	it("saves, finds, overwrites and deletes quizzes", async () => {
		const quizzes = new InMemoryQuizRepository();

		expect(await quizzes.findById("quiz-1")).toBeNull();

		await quizzes.save(quiz);
		expect(await quizzes.findById("quiz-1")).toEqual(quiz);

		await quizzes.save({ ...quiz, title: "Geografia" });
		expect((await quizzes.findById("quiz-1"))?.title).toBe("Geografia");
		expect(quizzes.all()).toHaveLength(1);

		await quizzes.delete("quiz-1");
		expect(await quizzes.findById("quiz-1")).toBeNull();
	});
});
