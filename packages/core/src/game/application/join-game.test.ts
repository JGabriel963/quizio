import { describe, expect, it } from "vitest";

import {
	GAME_MAX_PLAYERS,
	GAME_TTL_MS,
	GameFullError,
	GameLockedError,
	GameNotFoundError,
	GamePinNotRecognizedError,
	NicknameTakenError,
	TooManyPinAttemptsError,
} from "../domain/game";
import { GAME_EVENTS, gameChannel } from "../domain/game-events";
import { PIN_ATTEMPT_LIMIT, PIN_ATTEMPT_WINDOW_MS } from "../domain/game-pin";
import { InvalidNicknameError } from "../domain/nickname";
import { aGame, aPlayer } from "../testing/a-game";
import { createGameDeps, markRemoved } from "../testing/game-deps";
import { createStartedGame } from "../testing/started-game";
import { createEndGame } from "./end-game";
import { createFindGameByPin } from "./find-game-by-pin";
import { createGetPlayerSession } from "./get-player-session";
import { createJoinGame } from "./join-game";
import { createRemovePlayer } from "./remove-player";
import { createSetGameLocked } from "./set-game-locked";

const mine = { ownerId: "user-1", gameId: "game-1" };

async function lobby(overrides: Parameters<typeof aGame>[0] = {}) {
	const deps = createGameDeps();
	await deps.games.save(aGame({ createdAt: deps.clock.now(), ...overrides }));
	return deps;
}

describe("findGameByPin (spec 008)", () => {
	it("finds the open game, with or without the space", async () => {
		const deps = await lobby();
		const find = createFindGameByPin(deps);

		expect(await find({ pin: "265914", clientKey: "ip" })).toEqual({
			gameId: "game-1",
			pin: "265914",
		});
		expect(await find({ pin: "265 914", clientKey: "ip" })).toMatchObject({
			gameId: "game-1",
		});
	});

	it.each([
		["an unknown PIN", "569172"],
		["something that is not a PIN", "abc"],
	])("does not recognize %s", async (_name, pin) => {
		const deps = await lobby();

		await expect(
			createFindGameByPin(deps)({ pin, clientKey: "ip" }),
		).rejects.toThrow(GamePinNotRecognizedError);
	});

	it("does not recognize the PIN of an ended game", async () => {
		const deps = await lobby();
		await createEndGame(deps)(mine);

		await expect(
			createFindGameByPin(deps)({ pin: "265914", clientKey: "ip" }),
		).rejects.toThrow(GamePinNotRecognizedError);
	});

	it("does not recognize the PIN of a game past its deadline", async () => {
		const deps = await lobby();
		deps.clock.advanceBy(GAME_TTL_MS);

		await expect(
			createFindGameByPin(deps)({ pin: "265914", clientKey: "ip" }),
		).rejects.toThrow(GamePinNotRecognizedError);
		expect(await deps.games.findById("game-1")).toMatchObject({
			status: "ended",
			endReason: "expired",
		});
	});

	it("tells a locked game apart", async () => {
		const deps = await lobby({ locked: true });

		await expect(
			createFindGameByPin(deps)({ pin: "265914", clientKey: "ip" }),
		).rejects.toThrow(GameLockedError);
	});

	it("blocks a client after too many wrong PINs, even with the right one", async () => {
		const deps = await lobby();
		const find = createFindGameByPin(deps);
		for (let attempt = 0; attempt < PIN_ATTEMPT_LIMIT; attempt++) {
			await find({ pin: "111111", clientKey: "ip" }).catch(() => {});
		}

		await expect(find({ pin: "265914", clientKey: "ip" })).rejects.toThrow(
			TooManyPinAttemptsError,
		);
		// Another client is not affected, and the window passes.
		await expect(
			find({ pin: "265914", clientKey: "other" }),
		).resolves.toBeDefined();
		deps.clock.advanceBy(PIN_ATTEMPT_WINDOW_MS);
		await expect(
			find({ pin: "265914", clientKey: "ip" }),
		).resolves.toBeDefined();
	});

	it("wrong PINs sent at the same time do not get past the limit", async () => {
		const deps = await lobby();
		const find = createFindGameByPin(deps);

		const burst = await Promise.allSettled(
			Array.from({ length: PIN_ATTEMPT_LIMIT * 4 }, () =>
				find({ pin: "111111", clientKey: "ip" }),
			),
		);

		const refusals = burst.map((result) =>
			result.status === "rejected" ? result.reason : null,
		);
		expect(
			refusals.filter((error) => error instanceof GamePinNotRecognizedError),
		).toHaveLength(PIN_ATTEMPT_LIMIT);
		expect(
			refusals.filter((error) => error instanceof TooManyPinAttemptsError),
		).toHaveLength(PIN_ATTEMPT_LIMIT * 3);
	});

	it("the right PIN in a burst of wrong ones is held back with them", async () => {
		const deps = await lobby();
		const find = createFindGameByPin(deps);

		const burst = await Promise.allSettled([
			...Array.from({ length: PIN_ATTEMPT_LIMIT }, () =>
				find({ pin: "111111", clientKey: "ip" }),
			),
			find({ pin: "265914", clientKey: "ip" }),
		]);

		expect(burst.at(-1)).toMatchObject({
			status: "rejected",
			reason: expect.any(TooManyPinAttemptsError),
		});
	});

	it("right PINs and locked games do not count as attempts", async () => {
		const deps = await lobby();
		const find = createFindGameByPin(deps);

		for (let attempt = 0; attempt < PIN_ATTEMPT_LIMIT + 5; attempt++) {
			await find({ pin: "265914", clientKey: "ip" });
		}

		await expect(
			find({ pin: "265914", clientKey: "ip" }),
		).resolves.toBeDefined();
	});
});

describe("joinGame (spec 008)", () => {
	it("adds the player with the trimmed nickname and tells the lobby", async () => {
		const deps = await lobby();

		const joined = await createJoinGame(deps)({
			gameId: "game-1",
			nickname: "  ACT  ",
		});

		expect(joined).toEqual({
			playerId: "id-1",
			secret: "id-2",
			nickname: "ACT",
		});
		expect(await deps.players.listActive("game-1")).toMatchObject([
			{ id: "id-1", nickname: "ACT", nicknameKey: "act" },
		]);
		expect(deps.realtime.messagesOn(gameChannel("game-1"))).toEqual([
			{
				channel: gameChannel("game-1"),
				event: GAME_EVENTS.playerJoined,
				payload: { player: { id: "id-1", nickname: "ACT" } },
			},
		]);
	});

	it("keeps the order of arrival", async () => {
		const deps = await lobby();
		const join = createJoinGame(deps);

		for (const nickname of ["Ana", "Bia", "Caio"]) {
			await join({ gameId: "game-1", nickname });
		}

		expect(
			(await deps.players.listActive("game-1")).map(
				(player) => player.nickname,
			),
		).toEqual(["Ana", "Bia", "Caio"]);
	});

	it.each(["", "   ", "a".repeat(16)])(
		"refuses the nickname %j",
		async (nickname) => {
			const deps = await lobby();

			await expect(
				createJoinGame(deps)({ gameId: "game-1", nickname }),
			).rejects.toThrow(InvalidNicknameError);
		},
	);

	it("refuses a nickname in use, whatever the case and accents", async () => {
		const deps = await lobby();
		const join = createJoinGame(deps);
		await join({ gameId: "game-1", nickname: "José" });

		await expect(join({ gameId: "game-1", nickname: "jose" })).rejects.toThrow(
			NicknameTakenError,
		);
		expect(await deps.players.countActive("game-1")).toBe(1);
	});

	it("a removed nickname stays blocked, and another one gets in", async () => {
		const deps = await lobby();
		const join = createJoinGame(deps);
		const { playerId } = await join({ gameId: "game-1", nickname: "ACT" });
		await createRemovePlayer(deps)({ ...mine, playerId });

		await expect(join({ gameId: "game-1", nickname: "act" })).rejects.toThrow(
			NicknameTakenError,
		);
		await expect(
			join({ gameId: "game-1", nickname: "ACT2" }),
		).resolves.toMatchObject({ nickname: "ACT2" });
	});

	it("refuses a game locked while the player was typing", async () => {
		const deps = await lobby({ locked: true });

		await expect(
			createJoinGame(deps)({ gameId: "game-1", nickname: "ACT" }),
		).rejects.toThrow(GameLockedError);
	});

	it("refuses an ended or unknown game", async () => {
		const deps = await lobby();
		await createEndGame(deps)(mine);
		const join = createJoinGame(deps);

		await expect(join({ gameId: "game-1", nickname: "ACT" })).rejects.toThrow(
			GamePinNotRecognizedError,
		);
		await expect(join({ gameId: "missing", nickname: "ACT" })).rejects.toThrow(
			GamePinNotRecognizedError,
		);
	});

	it("refuses a full game, and takes someone in when a place opens", async () => {
		const deps = await lobby();
		for (let index = 0; index < GAME_MAX_PLAYERS; index++) {
			await deps.players.add(
				aPlayer({ id: `p${index}`, nickname: `jogador ${index}` }),
			);
		}
		const join = createJoinGame(deps);

		await expect(join({ gameId: "game-1", nickname: "ACT" })).rejects.toThrow(
			GameFullError,
		);

		await createRemovePlayer(deps)({ ...mine, playerId: "p0" });
		await expect(
			join({ gameId: "game-1", nickname: "ACT" }),
		).resolves.toBeDefined();
	});

	it("two players racing for the last place: one gets it", async () => {
		const deps = await lobby();
		for (let index = 1; index < GAME_MAX_PLAYERS; index++) {
			await deps.players.add(
				aPlayer({ id: `p${index}`, nickname: `jogador ${index}` }),
			);
		}
		const join = createJoinGame(deps);

		const race = await Promise.allSettled([
			join({ gameId: "game-1", nickname: "Ana" }),
			join({ gameId: "game-1", nickname: "Bia" }),
		]);

		expect(race.map((result) => result.status).sort()).toEqual([
			"fulfilled",
			"rejected",
		]);
		expect(race.find((result) => result.status === "rejected")).toMatchObject({
			reason: expect.any(GameFullError),
		});
		expect(await deps.players.countActive("game-1")).toBe(GAME_MAX_PLAYERS);
	});
});

describe("getPlayerSession (spec 008)", () => {
	async function joined() {
		const deps = await lobby();
		const player = await createJoinGame(deps)({
			gameId: "game-1",
			nickname: "ACT",
		});
		const session = {
			gameId: "game-1",
			playerId: player.playerId,
			secret: player.secret,
		};
		return { deps, session };
	}

	it("is waiting while in the lobby", async () => {
		const { deps, session } = await joined();

		expect(await createGetPlayerSession(deps)(session)).toEqual({
			gameId: "game-1",
			nickname: "ACT",
			status: "waiting",
			stage: null,
			final: null,
			hostIdleMs: 0,
		});
	});

	it("is removed after the host removes the player", async () => {
		const { deps, session } = await joined();
		await createRemovePlayer(deps)({ ...mine, playerId: session.playerId });

		expect(await createGetPlayerSession(deps)(session)).toMatchObject({
			status: "removed",
		});
	});

	it("is ended after the game ends or expires", async () => {
		const { deps, session } = await joined();
		deps.clock.advanceBy(GAME_TTL_MS);

		expect(await createGetPlayerSession(deps)(session)).toMatchObject({
			status: "ended",
		});
	});

	it("is not found with a wrong secret, player or game", async () => {
		const { deps, session } = await joined();
		const getPlayerSession = createGetPlayerSession(deps);

		for (const wrong of [
			{ ...session, secret: "guess" },
			{ ...session, playerId: "missing" },
			{ ...session, gameId: "missing" },
		]) {
			await expect(getPlayerSession(wrong)).rejects.toThrow(GameNotFoundError);
		}
	});
});

describe("joining a game in progress (spec 012)", () => {
	const find = { pin: "265914", clientKey: "ip" };
	const caio = { gameId: "game-1", nickname: "Caio" };

	it("finds a game in progress", async () => {
		const { deps, reach } = await createStartedGame();
		await reach("answering");

		expect(await createFindGameByPin(deps)(find)).toEqual({
			gameId: "game-1",
			pin: "265914",
		});
	});

	it("a locked game in progress tells it is locked", async () => {
		const { deps, host, reach } = await createStartedGame();
		await reach("answering");
		await createSetGameLocked(deps)({ ...host, locked: true });

		await expect(createFindGameByPin(deps)(find)).rejects.toThrow(
			GameLockedError,
		);
		await expect(createJoinGame(deps)(caio)).rejects.toThrow(GameLockedError);
		expect(await deps.players.countActive("game-1")).toBe(2);

		// Unlocked, the same PIN takes players again (CA-16).
		await createSetGameLocked(deps)({ ...host, locked: false });
		await expect(createJoinGame(deps)(caio)).resolves.toMatchObject({
			nickname: "Caio",
		});
	});

	it("a finished game's PIN is not recognized", async () => {
		const { deps, finish } = await createStartedGame();
		await finish();

		await expect(createFindGameByPin(deps)(find)).rejects.toThrow(
			GamePinNotRecognizedError,
		);
		await expect(createJoinGame(deps)(caio)).rejects.toThrow(
			GamePinNotRecognizedError,
		);
	});

	it("joins before the answers open and plays that question", async () => {
		const { deps, reach } = await createStartedGame();
		await reach("questionIntro", 1);

		const { playerId } = await createJoinGame(deps)(caio);

		expect(await deps.players.findById(playerId)).toMatchObject({
			nickname: "Caio",
			firstQuestionIndex: 1,
		});
	});

	it("joins with the answers open and waits for the next", async () => {
		const { deps, reach } = await createStartedGame();
		await reach("answering");

		const { playerId } = await createJoinGame(deps)(caio);

		expect((await deps.players.findById(playerId))?.firstQuestionIndex).toBe(1);
	});

	it("joins at the last answers", async () => {
		const { deps, reach } = await createStartedGame();
		await reach("answering", 1);

		const { playerId } = await createJoinGame(deps)(caio);

		// Past the last question: there is nothing left to answer (RN-17).
		expect((await deps.players.findById(playerId))?.firstQuestionIndex).toBe(2);
	});

	it("who joined in the lobby starts at the first question", async () => {
		const deps = await lobby();

		const { playerId } = await createJoinGame(deps)(caio);

		expect((await deps.players.findById(playerId))?.firstQuestionIndex).toBe(0);
	});

	it("a nickname in use is refused while the game is on", async () => {
		const { deps, reach } = await createStartedGame();
		await reach("answering");

		await expect(
			createJoinGame(deps)({ gameId: "game-1", nickname: "ana" }),
		).rejects.toThrow(NicknameTakenError);
	});

	it("a full game is refused while the game is on", async () => {
		const { deps, reach } = await createStartedGame();
		await reach("answering");
		for (let index = 2; index < GAME_MAX_PLAYERS; index++) {
			await deps.players.add(
				aPlayer({ id: `extra-${index}`, nickname: `jogador ${index}` }),
			);
		}

		await expect(createJoinGame(deps)(caio)).rejects.toThrow(GameFullError);
	});

	it("a removed nickname stays blocked", async () => {
		const { deps, reach } = await createStartedGame();
		await reach("answering");
		await markRemoved(deps, "p2");

		await expect(
			createJoinGame(deps)({ gameId: "game-1", nickname: "Bia" }),
		).rejects.toThrow(NicknameTakenError);
	});

	it("tells the host's screen about who joined", async () => {
		const { deps, reach } = await createStartedGame();
		await reach("answering");

		const { playerId } = await createJoinGame(deps)(caio);

		expect(deps.realtime.messages.at(-1)).toEqual({
			channel: gameChannel("game-1"),
			event: GAME_EVENTS.playerJoined,
			payload: { player: { id: playerId, nickname: "Caio" } },
		});
	});

	it("the PIN of a game in progress is not a wrong attempt", async () => {
		const { deps } = await createStartedGame();
		const findGameByPin = createFindGameByPin(deps);

		for (let attempt = 0; attempt < PIN_ATTEMPT_LIMIT + 1; attempt++) {
			await expect(findGameByPin(find)).resolves.toMatchObject({
				gameId: "game-1",
			});
		}
	});
});
