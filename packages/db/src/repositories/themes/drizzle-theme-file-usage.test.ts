import { aGame } from "@quizio/core/game/testing/a-game";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { user } from "../../schema/auth";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleGameRepository } from "../game/drizzle-game-repository";
import { createDrizzleThemeFileUsage } from "./drizzle-theme-file-usage";

describe("DrizzleThemeFileUsage (spec 043, RN-28)", () => {
	let testDb: TestDatabase;

	beforeAll(async () => {
		testDb = await createTestDb();
		await testDb.db
			.insert(user)
			.values({ id: "user-1", name: "Ana", email: "ana@quizio.test" });
		const games = createDrizzleGameRepository(testDb.db);
		await games.create(
			aGame({
				id: "with-image",
				quizId: "quiz-1",
				pin: "111111",
				customTheme: {
					background: {
						kind: "image",
						key: "themes/user-1/bg.jpg",
						tone: "dark",
					},
					accentColor: "#1368ce",
					logoKey: null,
				},
			}),
		);
		await games.create(
			aGame({
				id: "with-logo",
				quizId: "quiz-2",
				pin: "222222",
				customTheme: {
					background: { kind: "pattern", pattern: "waves", color: "#1b2a6b" },
					accentColor: "#ffd84d",
					logoKey: "themes/user-1/logo.png",
				},
			}),
		);
		await games.create(aGame({ id: "plain", quizId: "quiz-3", pin: "333333" }));
	});

	afterAll(() => testDb.close());

	it("finds the image and logo keys a game copied", async () => {
		const usage = createDrizzleThemeFileUsage(testDb.db);

		expect(
			await usage.inUse([
				"themes/user-1/bg.jpg",
				"themes/user-1/logo.png",
				"themes/user-1/other.png",
			]),
		).toEqual(new Set(["themes/user-1/bg.jpg", "themes/user-1/logo.png"]));
	});

	it("nothing asked is nothing in use", async () => {
		expect(await createDrizzleThemeFileUsage(testDb.db).inUse([])).toEqual(
			new Set(),
		);
	});
});
