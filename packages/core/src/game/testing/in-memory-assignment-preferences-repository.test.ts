import { describe, expect, it } from "vitest";

import { InMemoryAssignmentPreferencesRepository } from "./in-memory-assignment-preferences-repository";

describe("InMemoryAssignmentPreferencesRepository (spec 029)", () => {
	it("is null until saved", async () => {
		const preferences = new InMemoryAssignmentPreferencesRepository();

		expect(await preferences.find("user-1")).toBeNull();
	});

	it("returns what was saved", async () => {
		const preferences = new InMemoryAssignmentPreferencesRepository();
		const options = {
			gameCharacters: true,
			questionTimer: false,
			randomizeAnswers: true,
		};

		await preferences.save("user-1", options);

		expect(await preferences.find("user-1")).toEqual(options);
		expect(await preferences.find("user-2")).toBeNull();
	});
});
