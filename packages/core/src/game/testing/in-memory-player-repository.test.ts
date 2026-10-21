import { describe, expect, it } from "vitest";

import { aPlayer } from "./a-game";
import { InMemoryPlayerRepository } from "./in-memory-player-repository";

describe("InMemoryPlayerRepository", () => {
	it("saveAvatar changes only the avatar of the player (spec 028)", async () => {
		const players = new InMemoryPlayerRepository();
		await players.add(aPlayer());
		await players.add(aPlayer({ id: "player-2", nickname: "Bia" }));

		await players.saveAvatar("player-1", { character: "fox", accessory: null });

		expect(await players.findById("player-1")).toEqual({
			...aPlayer(),
			avatar: { character: "fox", accessory: null },
		});
		expect((await players.findById("player-2"))?.avatar).toEqual(
			aPlayer().avatar,
		);
	});
});

describe("InMemoryPlayerRepository: progress (spec 030)", () => {
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

	it("saveProgressIfAt writes only the progress when it is still at from", async () => {
		const players = new InMemoryPlayerRepository();
		await players.add(aPlayer({ progress: answering }));

		expect(await players.saveProgressIfAt("player-1", answering, results)).toBe(
			true,
		);
		expect(await players.findById("player-1")).toEqual(
			aPlayer({ progress: results }),
		);
	});

	it("saveProgressIfAt refuses when another request moved first", async () => {
		const players = new InMemoryPlayerRepository();
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
