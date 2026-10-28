import { beforeEach, describe, expect, it } from "vitest";
import { ThemeNotFoundError } from "../../shared/domain/theme";
import { FixedClock } from "../../shared/testing/fixed-clock";
import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { SequentialIdGenerator } from "../../shared/testing/sequential-id-generator";
import { aCustomTheme } from "../../themes/testing/a-custom-theme";
import { InMemoryThemeStore } from "../../themes/testing/in-memory-theme-store";
import { blankQuestion, QuestionTextTooLongError } from "../domain/question";
import { InvalidCoverImageError, UnknownThemeError } from "../domain/quiz";
import { QuizTitleTooLongError } from "../domain/quiz-details";
import { InMemoryQuestionRepository } from "../testing/in-memory-question-repository";
import { InMemoryQuizRepository } from "../testing/in-memory-quiz-repository";
import { type CreateQuiz, createCreateQuiz } from "./create-quiz";

describe("createQuiz", () => {
	let quizzes: InMemoryQuizRepository;
	let questions: InMemoryQuestionRepository;
	let storage: InMemoryObjectStorage;
	let themes: InMemoryThemeStore;
	let clock: FixedClock;
	let createQuiz: CreateQuiz;

	beforeEach(() => {
		quizzes = new InMemoryQuizRepository();
		questions = new InMemoryQuestionRepository();
		storage = new InMemoryObjectStorage("https://media.test");
		themes = new InMemoryThemeStore(quizzes);
		clock = new FixedClock("2026-06-01T12:00:00.000Z");
		createQuiz = createCreateQuiz({
			quizzes,
			questions,
			storage,
			customThemes: themes,
			ids: new SequentialIdGenerator("quiz"),
			clock,
		});
	});

	it("creates a private draft stamped now reporting one question", async () => {
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
			publishedVersion: null,
			publishedAt: null,
			hasUnpublishedChanges: false,
			themeId: "standard",
			customThemeId: null,
			questionCount: 1,
			createdAt: clock.now(),
			updatedAt: clock.now(),
			trashedAt: null,
		});
		expect(quizzes.all()).toEqual([
			expect.objectContaining({ id: "quiz-1", ownerId: "user-1" }),
		]);
	});

	it("creates the quiz with one blank quiz question", async () => {
		const view = await createQuiz({ ownerId: "user-1" });

		expect(questions.listOf(view.id)).toEqual([blankQuestion("quiz-2")]);
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
		expect(questions.listOf("quiz-1")).toHaveLength(0);
	});

	it("rejects titles above the limit without creating the quiz", async () => {
		await expect(
			createQuiz({ ownerId: "user-1", title: "a".repeat(96) }),
		).rejects.toThrow(QuizTitleTooLongError);
		expect(quizzes.all()).toHaveLength(0);
	});

	describe("from an AI agent (spec 044, RN-20, RN-22)", () => {
		it("with drafts, the quiz starts with them instead of the blank question, all made with AI", async () => {
			const view = await createQuiz({
				ownerId: "user-1",
				title: "Revolução Francesa",
				questions: [
					{ type: "trueFalse", text: "Começou em 1789", correct: true },
					{
						type: "typeAnswer",
						text: "Rei guilhotinado",
						acceptedAnswers: ["Luís XVI"],
					},
				],
			});

			expect(view.questionCount).toBe(2);
			expect(questions.listOf(view.id)).toEqual([
				expect.objectContaining({
					id: "quiz-2",
					type: "trueFalse",
					aiGenerated: true,
				}),
				expect.objectContaining({
					id: "quiz-3",
					type: "typeAnswer",
					aiGenerated: true,
				}),
			]);
		});

		it("an invalid draft refuses the whole quiz and writes nothing", async () => {
			await expect(
				createQuiz({
					ownerId: "user-1",
					questions: [
						{ type: "trueFalse", text: "Boa" },
						{ type: "trueFalse", text: "a".repeat(161) },
					],
				}),
			).rejects.toThrow(QuestionTextTooLongError);
			expect(quizzes.all()).toHaveLength(0);
		});

		it("starts with the chosen ready-made or custom theme", async () => {
			await themes.createTakingUploads(
				aCustomTheme({ id: "escola", ownerId: "user-1" }),
				[],
			);

			const ready = await createQuiz({
				ownerId: "user-1",
				theme: { kind: "catalog", themeId: "teal" },
			});
			const custom = await createQuiz({
				ownerId: "user-1",
				theme: { kind: "custom", customThemeId: "escola" },
			});

			expect(ready).toMatchObject({ themeId: "teal", customThemeId: null });
			expect(custom).toMatchObject({
				themeId: "standard",
				customThemeId: "escola",
			});
		});

		it("refuses an unknown theme or someone else's custom theme without creating", async () => {
			await themes.createTakingUploads(
				aCustomTheme({ id: "alheio", ownerId: "user-2" }),
				[],
			);

			await expect(
				createQuiz({
					ownerId: "user-1",
					theme: { kind: "catalog", themeId: "neon" },
				}),
			).rejects.toThrow(UnknownThemeError);
			await expect(
				createQuiz({
					ownerId: "user-1",
					theme: { kind: "custom", customThemeId: "alheio" },
				}),
			).rejects.toThrow(ThemeNotFoundError);
			expect(quizzes.all()).toHaveLength(0);
		});
	});
});
