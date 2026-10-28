import { aQuiz } from "@quizio/core/quiz/testing/a-quiz";
import { aCustomTheme } from "@quizio/core/themes/testing/a-custom-theme";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { user } from "../../schema/auth";
import { quiz } from "../../schema/quiz";
import { customTheme, themeUpload } from "../../schema/themes";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleQuizRepository } from "../quiz/drizzle-quiz-repository";
import { createDrizzleCustomThemeRepository } from "./drizzle-custom-theme-repository";
import { createDrizzleThemeUploadRepository } from "./drizzle-theme-upload-repository";

const AT = new Date("2026-10-28T12:00:00.000Z");
const later = (ms: number) => new Date(AT.getTime() + ms);

describe("DrizzleCustomThemeRepository (spec 043)", () => {
	let testDb: TestDatabase;

	beforeAll(async () => {
		testDb = await createTestDb();
		await testDb.db.insert(user).values([
			{ id: "owner-1", name: "Ana", email: "ana@quizio.test" },
			{ id: "owner-2", name: "Beto", email: "beto@quizio.test" },
		]);
	});

	afterAll(() => testDb.close());

	beforeEach(async () => {
		await testDb.db.delete(quiz);
		await testDb.db.delete(customTheme);
		await testDb.db.delete(themeUpload);
	});

	const themes = () => createDrizzleCustomThemeRepository(testDb.db);
	const uploads = () => createDrizzleThemeUploadRepository(testDb.db);

	it("creates taking the uploads in one transaction and reads the theme back", async () => {
		await uploads().addThemeUpload({
			key: "themes/owner-1/a.jpg",
			ownerId: "owner-1",
			createdAt: AT,
		});
		const theme = aCustomTheme({
			look: {
				background: {
					kind: "image",
					key: "themes/owner-1/a.jpg",
					tone: "light",
				},
				accentColor: "#1368ce",
				logoKey: null,
			},
		});

		expect(
			await themes().createTakingUploads(theme, ["themes/owner-1/a.jpg"]),
		).toBe("ok");

		expect(await themes().findById("theme-1")).toEqual(theme);
		expect(await testDb.db.select().from(themeUpload)).toEqual([]);
	});

	it("rolls back when an upload is missing or someone else's", async () => {
		await uploads().addThemeUpload({
			key: "themes/owner-1/a.jpg",
			ownerId: "owner-1",
			createdAt: AT,
		});
		await uploads().addThemeUpload({
			key: "themes/owner-2/b.jpg",
			ownerId: "owner-2",
			createdAt: AT,
		});

		expect(
			await themes().createTakingUploads(aCustomTheme(), [
				"themes/owner-1/a.jpg",
				"themes/owner-2/b.jpg",
			]),
		).toBe("uploadMissing");

		expect(await themes().findById("theme-1")).toBeNull();
		expect(await testDb.db.select().from(themeUpload)).toHaveLength(2);
	});

	it("lists the owner's newest first with quizCount", async () => {
		await themes().createTakingUploads(aCustomTheme({ id: "old" }), []);
		await themes().createTakingUploads(
			aCustomTheme({ id: "new", createdAt: later(1000) }),
			[],
		);
		await themes().createTakingUploads(
			aCustomTheme({ id: "beto", ownerId: "owner-2" }),
			[],
		);
		const quizzes = createDrizzleQuizRepository(testDb.db);
		await quizzes.save(
			aQuiz({ id: "q1", ownerId: "owner-1", customThemeId: "old" }),
		);
		await quizzes.save(
			aQuiz({ id: "q2", ownerId: "owner-1", customThemeId: "old" }),
		);

		const listed = await themes().listByOwner("owner-1");

		expect(listed.map((theme) => [theme.id, theme.quizCount])).toEqual([
			["new", 0],
			["old", 2],
		]);
	});

	it("updates the name and the look, taking new uploads", async () => {
		await themes().createTakingUploads(aCustomTheme(), []);
		await uploads().addThemeUpload({
			key: "themes/owner-1/logo.png",
			ownerId: "owner-1",
			createdAt: AT,
		});
		const changed = aCustomTheme({
			name: "Escola Verde",
			look: {
				background: { kind: "pattern", pattern: "rings", color: "#1b2a6b" },
				accentColor: "#26890c",
				logoKey: "themes/owner-1/logo.png",
			},
			updatedAt: later(5000),
		});

		expect(
			await themes().updateTakingUploads(changed, ["themes/owner-1/logo.png"]),
		).toBe("ok");

		expect(await themes().findById("theme-1")).toEqual(changed);
	});

	it("deletes a theme and its quizzes go back to standard", async () => {
		await themes().createTakingUploads(aCustomTheme(), []);
		const quizzes = createDrizzleQuizRepository(testDb.db);
		await quizzes.save(
			aQuiz({ id: "q1", ownerId: "owner-1", customThemeId: "theme-1" }),
		);

		await themes().delete("theme-1");

		expect(await themes().findById("theme-1")).toBeNull();
		expect((await quizzes.findById("q1"))?.customThemeId).toBeNull();
	});

	it("findOwned answers only the owner", async () => {
		await themes().createTakingUploads(aCustomTheme(), []);

		expect(await themes().findOwned("owner-1", "theme-1")).toMatchObject({
			id: "theme-1",
			look: { accentColor: "#ffd84d" },
		});
		expect(await themes().findOwned("owner-2", "theme-1")).toBeNull();
	});
});

describe("DrizzleThemeUploadRepository (spec 043, RN-29)", () => {
	let testDb: TestDatabase;

	beforeAll(async () => {
		testDb = await createTestDb();
		await testDb.db
			.insert(user)
			.values([{ id: "owner-1", name: "Ana", email: "ana@quizio.test" }]);
	});

	afterAll(() => testDb.close());

	it("removes only the owner's and takes the expired uploads once", async () => {
		const uploads = createDrizzleThemeUploadRepository(testDb.db);
		await uploads.addThemeUpload({
			key: "old",
			ownerId: "owner-1",
			createdAt: AT,
		});
		await uploads.addThemeUpload({
			key: "new",
			ownerId: "owner-1",
			createdAt: later(10_000),
		});
		await uploads.addThemeUpload({
			key: "mine",
			ownerId: "owner-1",
			createdAt: later(10_000),
		});

		expect(await uploads.removeThemeUpload("mine", "owner-2")).toBe(false);
		expect(await uploads.removeThemeUpload("mine", "owner-1")).toBe(true);
		expect(await uploads.takeExpiredThemeUploads(later(1), 20)).toEqual([
			"old",
		]);
		expect(await uploads.takeExpiredThemeUploads(later(1), 20)).toEqual([]);
	});
});
