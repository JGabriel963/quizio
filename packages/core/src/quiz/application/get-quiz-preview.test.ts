import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { QuizNotFoundError } from "../domain/quiz";
import { aQuestion } from "../testing/a-question";
import { aQuiz } from "../testing/a-quiz";
import { InMemoryQuestionRepository } from "../testing/in-memory-question-repository";
import { InMemoryQuizRepository } from "../testing/in-memory-quiz-repository";
import { createGetQuizPreview, type GetQuizPreview } from "./get-quiz-preview";

describe("getQuizPreview", () => {
	let quizzes: InMemoryQuizRepository;
	let questions: InMemoryQuestionRepository;
	let getQuizPreview: GetQuizPreview;

	beforeEach(() => {
		quizzes = new InMemoryQuizRepository();
		questions = new InMemoryQuestionRepository();
		getQuizPreview = createGetQuizPreview({
			quizzes,
			questions,
			storage: new InMemoryObjectStorage("https://media.test"),
		});
	});

	it("returns the live questions in order with their image URLs", async () => {
		await quizzes.save(aQuiz());
		const image = {
			key: "media/user-1/q.png",
			placement: "media" as const,
			crop: null,
			altText: null,
		};
		await questions.saveList("quiz-1", [
			aQuestion({ id: "a", image }),
			aQuestion({ id: "b" }),
		]);

		const view = await getQuizPreview({ ownerId: "user-1", quizId: "quiz-1" });

		expect(view.questions.map((question) => question.id)).toEqual(["a", "b"]);
		expect(view.imageUrls).toEqual({
			"media/user-1/q.png": "https://media.test/media/user-1/q.png",
		});
	});

	it("leaves a quiz without questions empty, unlike the editor", async () => {
		await quizzes.save(aQuiz());

		const view = await getQuizPreview({ ownerId: "user-1", quizId: "quiz-1" });

		expect(view.questions).toEqual([]);
		expect(await questions.listByQuiz("quiz-1")).toEqual([]);
	});

	it("shows the questions of a trashed quiz", async () => {
		await quizzes.save(aQuiz({ trashedAt: new Date("2026-02-01T10:00:00Z") }));
		await questions.saveList("quiz-1", [aQuestion({ id: "a" })]);

		const view = await getQuizPreview({ ownerId: "user-1", quizId: "quiz-1" });

		expect(view.questions).toHaveLength(1);
	});

	it("treats another owner's quiz as not found", async () => {
		await quizzes.save(aQuiz({ ownerId: "user-2" }));

		await expect(
			getQuizPreview({ ownerId: "user-1", quizId: "quiz-1" }),
		).rejects.toThrow(QuizNotFoundError);
	});
});
