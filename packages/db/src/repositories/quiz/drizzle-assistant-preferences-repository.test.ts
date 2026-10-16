import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { user } from "../../schema/auth";
import { assistantPreferences } from "../../schema/quiz";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleAssistantPreferencesRepository } from "./drizzle-assistant-preferences-repository";

describe("DrizzleAssistantPreferencesRepository", () => {
	let testDb: TestDatabase;

	beforeAll(async () => {
		testDb = await createTestDb();
		await testDb.db
			.insert(user)
			.values([{ id: "user-1", name: "Ana", email: "ana@quizio.test" }]);
	});

	afterAll(() => testDb.close());

	it("finds nothing for a new creator", async () => {
		const preferences = createDrizzleAssistantPreferencesRepository(testDb.db);

		expect(await preferences.find("user-1")).toBeNull();
	});

	it("saves and replaces the options", async () => {
		const preferences = createDrizzleAssistantPreferencesRepository(testDb.db);

		await preferences.save("user-1", {
			format: "mixed",
			language: "en",
			level: "advanced",
			count: 10,
		});
		await preferences.save("user-1", {
			format: "trueFalse",
			language: "es",
			level: "beginner",
			count: 5,
		});

		expect(await preferences.find("user-1")).toEqual({
			format: "trueFalse",
			language: "es",
			level: "beginner",
			count: 5,
		});
	});

	it("reads stored options tolerantly", async () => {
		const preferences = createDrizzleAssistantPreferencesRepository(testDb.db);
		await testDb.db
			.update(assistantPreferences)
			.set({ options: { format: "slider", count: 7 } });

		expect(await preferences.find("user-1")).toEqual({
			format: "quiz",
			language: "pt",
			level: "intermediate",
			count: 20,
		});
	});
});
