import { describe, expect, it } from "vitest";

import { UnknownAvatarError } from "../domain/avatar";
import { GameNotFoundError } from "../domain/game";
import { GAME_EVENTS, gameChannel } from "../domain/game-events";
import { AvatarFixedError } from "../domain/player";
import { aGame } from "../testing/a-game";
import { createGameDeps } from "../testing/game-deps";
import { createStartedGame } from "../testing/started-game";
import { createChangeAvatar } from "./change-avatar";
import { createJoinGame } from "./join-game";

const fox = { character: "fox", accessory: "crown" } as const;

async function joined(nickname = "Ana") {
	const deps = createGameDeps();
	await deps.games.save(aGame({ createdAt: deps.clock.now() }));
	const player = await createJoinGame(deps)({ gameId: "game-1", nickname });
	return {
		deps,
		session: {
			gameId: "game-1",
			playerId: player.playerId,
			secret: player.secret,
		},
	};
}

describe("changeAvatar (spec 028)", () => {
	it("saves the avatar and publishes avatar-changed", async () => {
		const { deps, session } = await joined();

		const changed = await createChangeAvatar(deps)({ ...session, avatar: fox });

		expect(changed).toEqual({ avatar: fox });
		expect((await deps.players.findById(session.playerId))?.avatar).toEqual(
			fox,
		);
		expect(deps.realtime.messages.at(-1)).toEqual({
			channel: gameChannel("game-1"),
			event: GAME_EVENTS.avatarChanged,
			payload: { playerId: session.playerId, avatar: fox },
		});
	});

	it("takes no accessory", async () => {
		const { deps, session } = await joined();

		await createChangeAvatar(deps)({
			...session,
			avatar: { character: "fox", accessory: null },
		});

		expect((await deps.players.findById(session.playerId))?.avatar).toEqual({
			character: "fox",
			accessory: null,
		});
	});

	it("two players may have the same avatar", async () => {
		const { deps, session } = await joined();
		const other = await createJoinGame(deps)({
			gameId: "game-1",
			nickname: "Bia",
		});
		const change = createChangeAvatar(deps);

		await change({ ...session, avatar: fox });
		await change({
			gameId: "game-1",
			playerId: other.playerId,
			secret: other.secret,
			avatar: fox,
		});

		expect(
			(await deps.players.listActive("game-1")).map((player) => player.avatar),
		).toEqual([fox, fox]);
	});

	it("refuses an unknown character and saves nothing", async () => {
		const { deps, session } = await joined();
		const before = deps.realtime.messages.length;

		await expect(
			createChangeAvatar(deps)({
				...session,
				avatar: { character: "dinosaur", accessory: null },
			}),
		).rejects.toThrow(UnknownAvatarError);
		expect((await deps.players.findById(session.playerId))?.avatar).toEqual({
			character: "moon",
			accessory: "fire",
		});
		expect(deps.realtime.messages).toHaveLength(before);
	});

	it("refuses a change after the game started and publishes nothing", async () => {
		const { deps } = await createStartedGame();
		const before = deps.realtime.messages.length;

		await expect(
			createChangeAvatar(deps)({
				gameId: "game-1",
				playerId: "p1",
				secret: "s1",
				avatar: fox,
			}),
		).rejects.toThrow(AvatarFixedError);
		expect(deps.realtime.messages).toHaveLength(before);
	});

	it("refuses a wrong secret as a missing session", async () => {
		const { deps, session } = await joined();

		await expect(
			createChangeAvatar(deps)({ ...session, secret: "guess", avatar: fox }),
		).rejects.toThrow(GameNotFoundError);
	});
});
