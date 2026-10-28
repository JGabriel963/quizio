import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { aCustomTheme } from "../../themes/testing/a-custom-theme";
import { InMemoryThemeStore } from "../../themes/testing/in-memory-theme-store";
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
	let themes: InMemoryThemeStore;

	beforeEach(() => {
		quizzes = new InMemoryQuizRepository();
		questions = new InMemoryQuestionRepository();
		themes = new InMemoryThemeStore(quizzes);
		getQuizDetails = createGetQuizDetails({
			quizzes,
			customThemes: themes,
			questions,
			storage: new InMemoryObjectStorage("https://media.test"),
		});
	});

	it("returns details with the cover URL and zero questions", async () => {
		const quiz = aQuiz({
			coverImageKey: "media/user-1/cover.png",
			visibility: "public",
		});
		await quizzes.save(quiz);

		const view = await getQuizDetails({ ownerId: "user-1", quizId: "quiz-1" });

		expect(view).toEqual({
			id: "quiz-1",
			title: "Bom de Bíblia (Junho)",
			description: "Atos 1 a 7",
			coverImageUrl: "https://media.test/media/user-1/cover.png",
			visibility: "public",
			status: "draft",
			publishedVersion: null,
			publishedAt: null,
			hasUnpublishedChanges: false,
			themeId: "standard",
			customThemeId: null,
			customTheme: null,
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

	it("carries the custom look with URLs (spec 043, RN-22)", async () => {
		await themes.createTakingUploads(
			aCustomTheme({
				id: "theme-1",
				ownerId: "user-1",
				look: {
					background: { kind: "pattern", pattern: "tiles", color: "#1b2a6b" },
					accentColor: "#ffd84d",
					logoKey: "themes/user-1/logo.png",
				},
			}),
			[],
		);
		await quizzes.save(aQuiz({ customThemeId: "theme-1" }));

		const view = await getQuizDetails({ ownerId: "user-1", quizId: "quiz-1" });

		expect(view.customTheme).toEqual({
			pattern: "tiles",
			backgroundColor: "#1b2a6b",
			imageUrl: null,
			imageTone: null,
			accentColor: "#ffd84d",
			logoUrl: "https://media.test/themes/user-1/logo.png",
		});
	});
});
