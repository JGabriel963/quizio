import { beforeEach, describe, expect, it } from "vitest";

import { FixedClock } from "../../shared/testing/fixed-clock";
import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { QuizTitleRequiredError } from "../domain/quiz";
import { QuizTitleTooLongError } from "../domain/quiz-details";
import { aQuestion } from "../testing/a-question";
import { aPublishedQuiz, aQuiz } from "../testing/a-quiz";
import { InMemoryQuestionRepository } from "../testing/in-memory-question-repository";
import { InMemoryQuizRepository } from "../testing/in-memory-quiz-repository";
import { createRenameQuiz, type RenameQuiz } from "./rename-quiz";

describe("renameQuiz", () => {
	let quizzes: InMemoryQuizRepository;
	let clock: FixedClock;
	let renameQuiz: RenameQuiz;
	const ref = { ownerId: "user-1", quizId: "quiz-1" };

	beforeEach(async () => {
		quizzes = new InMemoryQuizRepository();
		const questions = new InMemoryQuestionRepository();
		clock = new FixedClock("2026-06-01T12:00:00.000Z");
		renameQuiz = createRenameQuiz({
			quizzes,
			questions,
			storage: new InMemoryObjectStorage("https://media.test"),
			clock,
		});
		await quizzes.save(aQuiz());
		await questions.saveList("quiz-1", [aQuestion()]);
	});

	it("renames and touches updatedAt", async () => {
		const view = await renameQuiz({ ...ref, title: " Geografia " });

		expect(view).toEqual(
			expect.objectContaining({
				title: "Geografia",
				updatedAt: clock.now(),
				questionCount: 1,
			}),
		);
		expect((await quizzes.findById("quiz-1"))?.title).toBe("Geografia");
	});

	it("refuses more than 95 characters", async () => {
		await expect(renameQuiz({ ...ref, title: "a".repeat(96) })).rejects.toThrow(
			QuizTitleTooLongError,
		);
	});

	it("refuses to clear the title of a published quiz", async () => {
		await quizzes.save(aPublishedQuiz({ title: "Geografia" }));

		await expect(renameQuiz({ ...ref, title: "  " })).rejects.toThrow(
			QuizTitleRequiredError,
		);
		expect((await quizzes.findById("quiz-1"))?.title).toBe("Geografia");
	});

	it("renaming a published quiz is not a pending change", async () => {
		await quizzes.save(aPublishedQuiz());

		const view = await renameQuiz({ ...ref, title: "Geografia 2" });

		expect(view).toMatchObject({
			title: "Geografia 2",
			status: "published",
			publishedVersion: 1,
			hasUnpublishedChanges: false,
		});
	});
});
