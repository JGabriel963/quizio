import { aPublishedQuiz, aQuiz } from "@quizio/core/quiz/testing/a-quiz";
import { A_THEME_LOOK } from "@quizio/core/shared/testing/a-theme-look";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { user } from "../../schema/auth";
import { quiz as quizTable } from "../../schema/quiz";
import { customTheme } from "../../schema/themes";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleQuizRepository } from "./drizzle-quiz-repository";

describe("DrizzleQuizRepository", () => {
	let testDb: TestDatabase;

	beforeAll(async () => {
		testDb = await createTestDb();
		await testDb.db.insert(user).values([
			{ id: "user-1", name: "Ana", email: "ana@quizio.test" },
			{ id: "user-2", name: "Beto", email: "beto@quizio.test" },
		]);
	});

	afterAll(() => testDb.close());

	beforeEach(async () => {
		await testDb.db.delete(quizTable);
	});

	it("round-trips a quiz with every field", async () => {
		const quizzes = createDrizzleQuizRepository(testDb.db);
		const quiz = aQuiz({
			coverImageKey: "media/user-1/cover.png",
			visibility: "public",
			updatedAt: new Date("2026-01-05T08:30:15.123Z"),
			trashedAt: new Date("2026-02-01T10:00:00.000Z"),
		});

		await quizzes.save(quiz);

		expect(await quizzes.findById("quiz-1")).toEqual(quiz);
	});

	it("returns null for an unknown id", async () => {
		const quizzes = createDrizzleQuizRepository(testDb.db);

		expect(await quizzes.findById("missing")).toBeNull();
	});

	it("upserts on save", async () => {
		const quizzes = createDrizzleQuizRepository(testDb.db);
		await quizzes.save(aQuiz());
		const changed = aQuiz({
			title: null,
			description: null,
			updatedAt: new Date("2026-03-01T00:00:00.000Z"),
		});

		await quizzes.save(changed);

		expect(await quizzes.findById("quiz-1")).toEqual(changed);
		expect(await testDb.db.select().from(quizTable)).toHaveLength(1);
	});

	it("stores the published fields", async () => {
		const quizzes = createDrizzleQuizRepository(testDb.db);
		const published = aPublishedQuiz({
			publishedVersion: 3,
			publishedAt: new Date("2026-02-01T10:00:00.456Z"),
			hasUnpublishedChanges: true,
		});

		await quizzes.save(published);

		expect(await quizzes.findById("quiz-1")).toEqual(published);
	});

	it("markEdited writes only the edit marks", async () => {
		const quizzes = createDrizzleQuizRepository(testDb.db);
		await quizzes.save(aPublishedQuiz());
		await testDb.db
			.update(quizTable)
			.set({ title: "Mudou em outra requisição" })
			.where(eq(quizTable.id, "quiz-1"));
		const later = new Date("2026-03-01T00:00:00.000Z");

		await quizzes.markEdited("quiz-1", {
			updatedAt: later,
			hasUnpublishedChanges: true,
		});

		expect(await quizzes.findById("quiz-1")).toEqual({
			...aPublishedQuiz(),
			title: "Mudou em outra requisição",
			updatedAt: later,
			hasUnpublishedChanges: true,
		});
	});

	it("deletes a quiz", async () => {
		const quizzes = createDrizzleQuizRepository(testDb.db);
		await quizzes.save(aQuiz());

		await quizzes.delete("quiz-1");

		expect(await quizzes.findById("quiz-1")).toBeNull();
	});

	it("stores the normalized search title", async () => {
		const quizzes = createDrizzleQuizRepository(testDb.db);
		const searchTitleOf = async (id: string) =>
			(
				await testDb.db
					.select({ searchTitle: quizTable.searchTitle })
					.from(quizTable)
					.where(eq(quizTable.id, id))
			)[0]?.searchTitle;

		await quizzes.save(aQuiz({ id: "untitled", title: null }));
		await quizzes.save(aQuiz({ id: "accented", title: "BÍBLIA  Kids" }));

		expect(await searchTitleOf("untitled")).toBe("quiz sem titulo");
		expect(await searchTitleOf("accented")).toBe("biblia kids");
	});

	it("removes quizzes when their owner is removed", async () => {
		const quizzes = createDrizzleQuizRepository(testDb.db);
		await testDb.db
			.insert(user)
			.values({ id: "user-3", name: "Caio", email: "caio@quizio.test" });
		await quizzes.save(aQuiz({ ownerId: "user-3" }));

		await testDb.db.delete(user).where(eq(user.id, "user-3"));

		expect(await quizzes.findById("quiz-1")).toBeNull();
	});

	it("saveVisibility writes only the visibility and the edit time (spec 039)", async () => {
		const quizzes = createDrizzleQuizRepository(testDb.db);
		const quiz = aQuiz({ title: "Capitais" });
		await quizzes.save(quiz);
		const later = new Date("2026-10-27T12:00:00.000Z");

		await quizzes.saveVisibility(quiz.id, {
			visibility: "public",
			updatedAt: later,
		});

		expect(await quizzes.findById(quiz.id)).toEqual({
			...quiz,
			visibility: "public",
			updatedAt: later,
		});
	});

	it("round-trips the theme (spec 042)", async () => {
		const quizzes = createDrizzleQuizRepository(testDb.db);
		const quiz = aQuiz({ themeId: "light-blue" });

		await quizzes.save(quiz);

		expect(await quizzes.findById(quiz.id)).toEqual(quiz);
	});

	it("a quiz stored without a theme reads standard (spec 042, RN-04)", async () => {
		const quizzes = createDrizzleQuizRepository(testDb.db);
		const at = new Date("2026-01-01T10:00:00.000Z");
		await testDb.db.insert(quizTable).values({
			id: "quiz-old",
			ownerId: "user-1",
			searchTitle: "",
			createdAt: at,
			updatedAt: at,
		});

		expect((await quizzes.findById("quiz-old"))?.themeId).toBe("standard");
	});

	it("a stored theme that left the catalog reads standard (spec 042, RN-05)", async () => {
		const quizzes = createDrizzleQuizRepository(testDb.db);
		const quiz = aQuiz();
		await quizzes.save(quiz);
		await testDb.db
			.update(quizTable)
			.set({ themeId: "autumn" })
			.where(eq(quizTable.id, quiz.id));

		expect((await quizzes.findById(quiz.id))?.themeId).toBe("standard");
	});

	it("saveTheme writes only the theme and the edit time, keeping a rename made meanwhile (spec 042)", async () => {
		const quizzes = createDrizzleQuizRepository(testDb.db);
		const quiz = aQuiz({ title: "Capitais" });
		await quizzes.save(quiz);
		await quizzes.save({ ...quiz, title: "Geografia" });
		const later = new Date("2026-10-27T12:00:00.000Z");

		await quizzes.saveTheme(quiz.id, {
			themeId: "teal",
			customThemeId: null,
			updatedAt: later,
		});

		expect(await quizzes.findById(quiz.id)).toEqual({
			...quiz,
			title: "Geografia",
			themeId: "teal",
			updatedAt: later,
		});
	});

	it("saveTheme writes the custom theme with the catalog id (spec 043)", async () => {
		const quizzes = createDrizzleQuizRepository(testDb.db);
		const quiz = aQuiz({ themeId: "red" });
		await quizzes.save(quiz);
		await testDb.db.insert(customTheme).values({
			id: "theme-1",
			ownerId: "user-1",
			name: "Escola Azul",
			look: A_THEME_LOOK,
			createdAt: quiz.createdAt,
			updatedAt: quiz.createdAt,
		});
		const later = new Date("2026-10-28T12:00:00.000Z");

		await quizzes.saveTheme(quiz.id, {
			themeId: "standard",
			customThemeId: "theme-1",
			updatedAt: later,
		});

		expect(await quizzes.findById(quiz.id)).toMatchObject({
			themeId: "standard",
			customThemeId: "theme-1",
			updatedAt: later,
		});
	});

	it("an unlisted row reads as private (spec 039, RN-25)", async () => {
		const quizzes = createDrizzleQuizRepository(testDb.db);
		const quiz = aQuiz();
		await quizzes.save(quiz);
		await testDb.db
			.update(quizTable)
			.set({ visibility: "unlisted" as never })
			.where(eq(quizTable.id, quiz.id));

		expect((await quizzes.findById(quiz.id))?.visibility).toBe("private");
	});
});
