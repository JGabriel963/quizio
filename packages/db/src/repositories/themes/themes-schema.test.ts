import { aQuiz } from "@quizio/core/quiz/testing/a-quiz";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { user } from "../../schema/auth";
import { quiz } from "../../schema/quiz";
import { customTheme, themeUpload } from "../../schema/themes";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleQuizRepository } from "../quiz/drizzle-quiz-repository";

const AT = new Date("2026-10-28T12:00:00.000Z");
const LOOK = {
	background: { kind: "pattern", pattern: "waves", color: "#1b2a6b" },
	accentColor: "#ffd84d",
	logoKey: null,
};

describe("themes schema (spec 043, ADR 0022)", () => {
	let testDb: TestDatabase;

	beforeAll(async () => {
		testDb = await createTestDb();
		await testDb.db.insert(user).values([
			{ id: "user-1", name: "Ana", email: "ana@quizio.test" },
			{ id: "user-2", name: "Beto", email: "beto@quizio.test" },
		]);
	});

	afterAll(() => testDb.close());

	it("deleting a custom theme sets quiz.custom_theme_id to null (RN-19)", async () => {
		await testDb.db.insert(customTheme).values({
			id: "theme-1",
			ownerId: "user-1",
			name: "Escola Azul",
			look: LOOK,
			createdAt: AT,
			updatedAt: AT,
		});
		await createDrizzleQuizRepository(testDb.db).save(
			aQuiz({ id: "quiz-1", customThemeId: "theme-1" }),
		);

		await testDb.db.delete(customTheme).where(eq(customTheme.id, "theme-1"));

		const [row] = await testDb.db
			.select({ customThemeId: quiz.customThemeId, themeId: quiz.themeId })
			.from(quiz)
			.where(eq(quiz.id, "quiz-1"));
		expect(row).toEqual({ customThemeId: null, themeId: "standard" });
	});

	it("deleting the user deletes their themes and pending uploads (RN-30)", async () => {
		await testDb.db.insert(customTheme).values({
			id: "theme-2",
			ownerId: "user-2",
			name: "Do Beto",
			look: LOOK,
			createdAt: AT,
			updatedAt: AT,
		});
		await testDb.db
			.insert(themeUpload)
			.values({ key: "themes/user-2/a.png", ownerId: "user-2", createdAt: AT });

		await testDb.db.delete(user).where(eq(user.id, "user-2"));

		expect(
			await testDb.db
				.select()
				.from(customTheme)
				.where(eq(customTheme.ownerId, "user-2")),
		).toEqual([]);
		expect(await testDb.db.select().from(themeUpload)).toEqual([]);
	});
});
