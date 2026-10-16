import { describe, expect, it } from "vitest";

import { aPlayer } from "./a-game";
import { InMemoryPlayerRepository } from "./in-memory-player-repository";

describe("InMemoryPlayerRepository", () => {
	it("saveAvatar changes only the avatar of the player (spec 027)", async () => {
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
