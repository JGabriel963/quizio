import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { QuizNotFoundError } from "../domain/quiz";
import { aQuestion } from "../testing/a-question";
import { aQuiz } from "../testing/a-quiz";
import { InMemoryQuestionRepository } from "../testing/in-memory-question-repository";
import { InMemoryQuizRepository } from "../testing/in-memory-quiz-repository";
import { createGetQuizDetails, type GetQuizDetails } from "./get-quiz-details";

describe("getQuizDetails", () => {
	let quizzes: InMemoryQuizRepository;
	let questions: InMemoryQuestionRepository;
	let getQuizDetails: GetQuizDetails;

	beforeEach(() => {
		quizzes = new InMemoryQuizRepository();
		questions = new InMemoryQuestionRepository();
		getQuizDetails = createGetQuizDetails({
			quizzes,
			questions,
			storage: new InMemoryObjectStorage("https://media.test"),
		});
	});

	it("returns details with the cover URL and zero questions", async () => {
		const quiz = aQuiz({
			coverImageKey: "media/user-1/cover.png",
			visibility: "unlisted",
		});
		await quizzes.save(quiz);

		const view = await getQuizDetails({ ownerId: "user-1", quizId: "quiz-1" });

		expect(view).toEqual({
			id: "quiz-1",
			title: "Bom de Bíblia (Junho)",
			description: "Atos 1 a 7",
			coverImageUrl: "https://media.test/media/user-1/cover.png",
			visibility: "unlisted",
			status: "draft",
			questionCount: 0,
			createdAt: quiz.createdAt,
			updatedAt: quiz.updatedAt,
			trashedAt: null,
		});
	});

	it("reports the quiz's question count", async () => {
		await quizzes.save(aQuiz());
		await questions.saveList("quiz-1", [
			aQuestion({ id: "a" }),
			aQuestion({ id: "b" }),
			aQuestion({ id: "c" }),
		]);

		const view = await getQuizDetails({ ownerId: "user-1", quizId: "quiz-1" });

		expect(view.questionCount).toBe(3);
	});

	it("returns trashed quizzes flagged with trashedAt", async () => {
		const trashedAt = new Date("2026-02-01T10:00:00.000Z");
		await quizzes.save(aQuiz({ trashedAt }));

		const view = await getQuizDetails({ ownerId: "user-1", quizId: "quiz-1" });

		expect(view.trashedAt).toEqual(trashedAt);
	});

	it("treats another owner's quiz as not found", async () => {
		await quizzes.save(aQuiz({ ownerId: "user-2" }));

		await expect(
			getQuizDetails({ ownerId: "user-1", quizId: "quiz-1" }),
		).rejects.toThrow(QuizNotFoundError);
	});
});
