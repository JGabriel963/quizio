import { beforeEach, describe, expect, it } from "vitest";

import { FixedClock } from "../../shared/testing/fixed-clock";
import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { ThemeNotFoundError } from "../../themes/domain/theme-errors";
import { aCustomTheme } from "../../themes/testing/a-custom-theme";
import { InMemoryThemeStore } from "../../themes/testing/in-memory-theme-store";
import {
	QuizInTrashError,
	QuizNotFoundError,
	trashQuiz,
	UnknownThemeError,
} from "../domain/quiz";
import { aPublishedQuiz, aQuiz } from "../testing/a-quiz";
import { InMemoryQuestionRepository } from "../testing/in-memory-question-repository";
import { InMemoryQuizRepository } from "../testing/in-memory-quiz-repository";
import { createSetQuizTheme, type SetQuizTheme } from "./set-quiz-theme";

describe("setQuizTheme (spec 042; spec 043)", () => {
	let quizzes: InMemoryQuizRepository;
	let clock: FixedClock;
	let setTheme: SetQuizTheme;
	let themes: InMemoryThemeStore;

	beforeEach(async () => {
		quizzes = new InMemoryQuizRepository();
		clock = new FixedClock("2026-10-27T12:00:00.000Z");
		themes = new InMemoryThemeStore(quizzes);
		await themes.createTakingUploads(
			aCustomTheme({ id: "theme-1", ownerId: "user-1" }),
			[],
		);
		await themes.createTakingUploads(
			aCustomTheme({ id: "theme-2", ownerId: "user-2" }),
			[],
		);
		setTheme = createSetQuizTheme({
			quizzes,
			customThemes: themes,
			questions: new InMemoryQuestionRepository(),
			storage: new InMemoryObjectStorage(),
			clock,
		});
		await quizzes.save(aQuiz({ id: "quiz-1", ownerId: "user-1" }));
	});

	it("saves the chosen theme and returns it in the details", async () => {
		const view = await setTheme({
			ownerId: "user-1",
			quizId: "quiz-1",
			choice: { kind: "catalog", themeId: "light-blue" },
		});

		expect(view.themeId).toBe("light-blue");
		expect(await quizzes.findById("quiz-1")).toMatchObject({
			themeId: "light-blue",
			updatedAt: clock.now(),
		});
	});

	it("saves the theme of a draft", async () => {
		await setTheme({
			ownerId: "user-1",
			quizId: "quiz-1",
			choice: { kind: "catalog", themeId: "red" },
		});

		expect(await quizzes.findById("quiz-1")).toMatchObject({
			status: "draft",
			themeId: "red",
		});
	});

	it("keeps the published state and the version of a published quiz", async () => {
		await quizzes.save(
			aPublishedQuiz({ id: "quiz-2", ownerId: "user-1", publishedVersion: 3 }),
		);

		const view = await setTheme({
			ownerId: "user-1",
			quizId: "quiz-2",
			choice: { kind: "catalog", themeId: "graphite" },
		});

		expect(view).toMatchObject({
			status: "published",
			publishedVersion: 3,
			hasUnpublishedChanges: false,
			themeId: "graphite",
		});
	});

	it("refuses an unknown theme and saves nothing", async () => {
		await expect(
			setTheme({
				ownerId: "user-1",
				quizId: "quiz-1",
				choice: { kind: "catalog", themeId: "autumn" },
			}),
		).rejects.toThrow(UnknownThemeError);
		expect((await quizzes.findById("quiz-1"))?.themeId).toBe("standard");
	});

	it("refuses a quiz in the trash", async () => {
		const quiz = await quizzes.findById("quiz-1");
		if (!quiz) {
			throw new Error("The quiz should exist");
		}
		await quizzes.save(trashQuiz(quiz, clock.now()));

		await expect(
			setTheme({
				ownerId: "user-1",
				quizId: "quiz-1",
				choice: { kind: "catalog", themeId: "red" },
			}),
		).rejects.toThrow(QuizInTrashError);
	});

	it("treats someone else's quiz as missing", async () => {
		await expect(
			setTheme({
				ownerId: "user-2",
				quizId: "quiz-1",
				choice: { kind: "catalog", themeId: "red" },
			}),
		).rejects.toThrow(QuizNotFoundError);
	});

	it("applies an own custom theme and resets the catalog id to standard (spec 043)", async () => {
		await setTheme({
			ownerId: "user-1",
			quizId: "quiz-1",
			choice: { kind: "catalog", themeId: "red" },
		});

		const view = await setTheme({
			ownerId: "user-1",
			quizId: "quiz-1",
			choice: { kind: "custom", customThemeId: "theme-1" },
		});

		expect(view).toMatchObject({
			themeId: "standard",
			customThemeId: "theme-1",
		});
		expect(await quizzes.findById("quiz-1")).toMatchObject({
			themeId: "standard",
			customThemeId: "theme-1",
			updatedAt: clock.now(),
		});
	});

	it("choosing a catalog theme clears the custom theme (spec 043)", async () => {
		await setTheme({
			ownerId: "user-1",
			quizId: "quiz-1",
			choice: { kind: "custom", customThemeId: "theme-1" },
		});

		await setTheme({
			ownerId: "user-1",
			quizId: "quiz-1",
			choice: { kind: "catalog", themeId: "teal" },
		});

		expect(await quizzes.findById("quiz-1")).toMatchObject({
			themeId: "teal",
			customThemeId: null,
		});
	});

	it("someone else's or a deleted theme is THEME.NOT_FOUND (spec 043, RN-20, RN-21)", async () => {
		await expect(
			setTheme({
				ownerId: "user-1",
				quizId: "quiz-1",
				choice: { kind: "custom", customThemeId: "theme-2" },
			}),
		).rejects.toThrow(ThemeNotFoundError);
		await themes.delete("theme-1");
		await expect(
			setTheme({
				ownerId: "user-1",
				quizId: "quiz-1",
				choice: { kind: "custom", customThemeId: "theme-1" },
			}),
		).rejects.toThrow(ThemeNotFoundError);
		expect((await quizzes.findById("quiz-1"))?.customThemeId).toBeNull();
	});

	it("does not mark unpublished changes (spec 043, RN-23)", async () => {
		await quizzes.save(aPublishedQuiz({ id: "quiz-2", ownerId: "user-1" }));

		const view = await setTheme({
			ownerId: "user-1",
			quizId: "quiz-2",
			choice: { kind: "custom", customThemeId: "theme-1" },
		});

		expect(view.hasUnpublishedChanges).toBe(false);
	});
});
