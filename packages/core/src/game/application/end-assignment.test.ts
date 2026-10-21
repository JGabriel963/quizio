import { describe, expect, it } from "vitest";

import { DEFAULT_ASSIGNMENT_OPTIONS } from "../domain/assignment";
import { GameNotFoundError } from "../domain/game";
import { createGameDeps } from "../testing/game-deps";
import { createCreateAssignment } from "./create-assignment";
import { createEndAssignment } from "./end-assignment";
import { createHostGame } from "./host-game";

const start = new Date("2026-06-01T12:00:00.000Z");
const later = (ms: number) => new Date(start.getTime() + ms);

async function anOpenAssignment() {
	const deps = createGameDeps();
	const { gameId } = await createCreateAssignment(deps)({
		ownerId: "user-1",
		quizId: "quiz-1",
		deadline: later(3 * 24 * 60 * 60 * 1000),
		options: DEFAULT_ASSIGNMENT_OPTIONS,
	});
	return { deps, gameId };
}

describe("endAssignment (spec 029, RN-39)", () => {
	it("ends the assignment now, by its owner", async () => {
		const { deps, gameId } = await anOpenAssignment();
		deps.clock.advanceBy(60_000);

		await createEndAssignment(deps)({ ownerId: "user-1", gameId });

		expect(await deps.games.findById(gameId)).toMatchObject({
			status: "ended",
			endReason: "host",
			endedAt: later(60_000),
		});
	});

	it("ending twice keeps the first instant", async () => {
		const { deps, gameId } = await anOpenAssignment();
		const end = createEndAssignment(deps);
		deps.clock.advanceBy(60_000);
		await end({ ownerId: "user-1", gameId });

		deps.clock.advanceBy(60_000);
		await end({ ownerId: "user-1", gameId });

		expect((await deps.games.findById(gameId))?.endedAt).toEqual(later(60_000));
	});

	it("refuses another creator's assignment and a live game as missing", async () => {
		const { deps, gameId } = await anOpenAssignment();
		const end = createEndAssignment(deps);
		const { gameId: liveId } = await createHostGame(deps)({
			ownerId: "user-1",
			quizId: "quiz-1",
		});

		await expect(end({ ownerId: "user-2", gameId })).rejects.toThrow(
			GameNotFoundError,
		);
		await expect(end({ ownerId: "user-1", gameId: liveId })).rejects.toThrow(
			GameNotFoundError,
		);
		expect((await deps.games.findById(liveId))?.endedAt).toBeNull();
	});
});
