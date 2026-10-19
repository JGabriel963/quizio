import { describe, expect, it } from "vitest";

import { DEFAULT_ASSIGNMENT_OPTIONS } from "../domain/assignment";
import { createGameDeps } from "../testing/game-deps";
import { createGetAssignmentSetup } from "./get-assignment-setup";

describe("getAssignmentSetup (spec 029, RN-14)", () => {
	it("gives the defaults to a creator who never assigned", async () => {
		const deps = createGameDeps();

		expect(await createGetAssignmentSetup(deps)({ ownerId: "user-1" })).toEqual(
			{ options: DEFAULT_ASSIGNMENT_OPTIONS, maxDeadlineDays: 28 },
		);
	});

	it("gives the options saved last", async () => {
		const deps = createGameDeps();
		const options = {
			gameCharacters: true,
			questionTimer: false,
			randomizeAnswers: true,
		};
		await deps.assignmentPreferences.save("user-1", options);

		expect(
			(await createGetAssignmentSetup(deps)({ ownerId: "user-1" })).options,
		).toEqual(options);
	});

	it("gives the configured maximum days", async () => {
		const deps = { ...createGameDeps(), maxDeadlineDays: 7 };

		expect(
			(await createGetAssignmentSetup(deps)({ ownerId: "user-1" }))
				.maxDeadlineDays,
		).toBe(7);
	});
});
