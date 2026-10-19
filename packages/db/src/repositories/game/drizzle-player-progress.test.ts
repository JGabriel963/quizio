import { aGame, aPlayer } from "@quizio/core/game/testing/a-game";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { user } from "../../schema/auth";
import { game as gameTable } from "../../schema/game";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleGameRepository } from "./drizzle-game-repository";
import { createDrizzlePlayerRepository } from "./drizzle-player-repository";

const at = (iso: string) => new Date(iso);
const answering = {
	questionIndex: 0,
	phase: "answering" as const,
	startedAt: at("2026-10-19T14:00:00.000Z"),
};
const results = {
	questionIndex: 0,
	phase: "results" as const,
	startedAt: at("2026-10-19T14:00:05.000Z"),
};

describe("participant progress in the player repository (spec 030)", () => {
	let testDb: TestDatabase;
	let players: ReturnType<typeof createDrizzlePlayerRepository>;

	beforeAll(async () => {
		testDb = await createTestDb();
		await testDb.db
			.insert(user)
			.values([{ id: "user-1", name: "Ana", email: "ana@quizio.test" }]);
		players = createDrizzlePlayerRepository(testDb.db);
		await createDrizzleGameRepository(testDb.db).create(aGame());
	});

	afterAll(() => testDb.close());

	beforeEach(async () => {
		await testDb.db.delete(gameTable);
		await createDrizzleGameRepository(testDb.db).create(aGame());
	});

	it("stores and reads back a participant's progress and answer order", async () => {
		const participant = aPlayer({
			progress: answering,
			choiceOrder: [
				["choice-2", "choice-1"],
				["true", "false"],
			],
		});

		await players.add(participant);

		expect(await players.findById("player-1")).toEqual(participant);
	});

	it("a live player reads back without progress", async () => {
		await players.add(aPlayer());

		expect(await players.findById("player-1")).toMatchObject({
			progress: null,
			choiceOrder: null,
		});
	});

	it("saveProgressIfAt writes only when still at from", async () => {
		await players.add(aPlayer({ progress: answering }));

		expect(await players.saveProgressIfAt("player-1", answering, results)).toBe(
			true,
		);
		expect(await players.findById("player-1")).toEqual(
			aPlayer({ progress: results }),
		);
	});

	it("saveProgressIfAt refuses a stale from", async () => {
		await players.add(aPlayer({ progress: results }));

		expect(
			await players.saveProgressIfAt("player-1", answering, {
				...results,
				phase: "scoreboard",
			}),
		).toBe(false);
		expect((await players.findById("player-1"))?.progress).toEqual(results);
	});
});
