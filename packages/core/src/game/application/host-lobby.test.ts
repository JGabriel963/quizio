import { describe, expect, it } from "vitest";

import { GAME_TTL_MS, GameEndedError, GameNotFoundError } from "../domain/game";
import { GAME_EVENTS, gameChannel } from "../domain/game-events";
import { aGame, aPlayer } from "../testing/a-game";
import { createGameDeps } from "../testing/game-deps";
import { createStartedGame } from "../testing/started-game";
import { createEndGame } from "./end-game";
import { createGetHostGame } from "./get-host-game";
import { createRemovePlayer } from "./remove-player";
import { createSetGameLocked } from "./set-game-locked";

const mine = { ownerId: "user-1", gameId: "game-1" };

async function lobby(game = aGame()) {
	const deps = createGameDeps();
	await deps.games.save({ ...game, createdAt: deps.clock.now() });
	return deps;
}

describe("getHostGame (spec 008)", () => {
	it("shows the PIN and the active players in order of arrival", async () => {
		const deps = await lobby();
		await deps.players.add(aPlayer({ id: "p1", nickname: "Ana" }));
		await deps.players.add(aPlayer({ id: "p2", nickname: "Bia" }));
		await deps.players.add(
			aPlayer({ id: "p3", nickname: "Caio", removedAt: new Date() }),
		);

		const view = await createGetHostGame(deps)(mine);

		expect(view).toEqual({
			gameId: "game-1",
			quizId: "quiz-1",
			title: "Bom de Bíblia (Junho)",
			pin: "265914",
			status: "lobby",
			endReason: null,
			locked: false,
			options: {
				showQuestionsOnDevices: false,
				randomizeQuestions: false,
				randomizeAnswers: false,
			},
			players: [
				{ id: "p1", nickname: "Ana" },
				{ id: "p2", nickname: "Bia" },
			],
			questionCount: 0,
			stage: null,
			final: null,
		});
	});

	it("never shows a player's secret", async () => {
		const deps = await lobby();
		await deps.players.add(aPlayer({ secret: "s3cret" }));

		const view = await createGetHostGame(deps)(mine);

		expect(JSON.stringify(view)).not.toContain("s3cret");
	});

	it("is not found for another creator", async () => {
		const deps = await lobby();
		const getHostGame = createGetHostGame(deps);

		await expect(
			getHostGame({ ownerId: "user-2", gameId: "game-1" }),
		).rejects.toThrow(GameNotFoundError);
		await expect(
			getHostGame({ ownerId: "user-1", gameId: "missing" }),
		).rejects.toThrow(GameNotFoundError);
	});

	it("shows a game past its deadline as ended", async () => {
		const deps = await lobby();
		deps.clock.advanceBy(GAME_TTL_MS);

		const view = await createGetHostGame(deps)(mine);

		expect(view).toMatchObject({ status: "ended", endReason: "expired" });
		expect(await deps.games.findById("game-1")).toMatchObject({
			status: "ended",
		});
	});
});

describe("setGameLocked (spec 008)", () => {
	it("locks, unlocks and tells the screens", async () => {
		const deps = await lobby();
		const setGameLocked = createSetGameLocked(deps);

		expect(await setGameLocked({ ...mine, locked: true })).toEqual({
			locked: true,
		});
		expect((await deps.games.findById("game-1"))?.locked).toBe(true);

		await setGameLocked({ ...mine, locked: false });

		expect((await deps.games.findById("game-1"))?.locked).toBe(false);
		expect(
			deps.realtime
				.messagesOn(gameChannel("game-1"))
				.map(({ event, payload }) => [event, payload]),
		).toEqual([
			[GAME_EVENTS.lockChanged, { locked: true }],
			[GAME_EVENTS.lockChanged, { locked: false }],
		]);
	});

	it("refuses another creator and an ended game", async () => {
		const deps = await lobby();
		const setGameLocked = createSetGameLocked(deps);

		await expect(
			setGameLocked({ ownerId: "user-2", gameId: "game-1", locked: true }),
		).rejects.toThrow(GameNotFoundError);

		await createEndGame(deps)(mine);
		await expect(setGameLocked({ ...mine, locked: true })).rejects.toThrow(
			GameEndedError,
		);
	});

	it("locks and unlocks a game in progress (spec 012)", async () => {
		const { deps, host, reach, stage } = await createStartedGame();
		await reach("answering");
		const setGameLocked = createSetGameLocked(deps);

		await setGameLocked({ ...host, locked: true });

		expect(await deps.games.findById("game-1")).toMatchObject({
			status: "playing",
			locked: true,
		});
		expect(await stage()).toEqual({ questionIndex: 0, phase: "answering" });

		await setGameLocked({ ...host, locked: false });

		expect((await deps.games.findById("game-1"))?.locked).toBe(false);
		expect(await stage()).toEqual({ questionIndex: 0, phase: "answering" });
	});

	it("locking does not undo an advance written meanwhile (spec 012)", async () => {
		const { deps, host, reach, stage } = await createStartedGame();
		await reach("answering");
		// The request reads the game, and the answers close before it writes.
		const findById = deps.games.findById.bind(deps.games);
		let raced = false;
		deps.games.findById = async (id) => {
			const game = await findById(id);
			if (!raced) {
				raced = true;
				await reach("results");
			}
			return game;
		};

		await createSetGameLocked(deps)({ ...host, locked: true });

		expect(await stage()).toEqual({ questionIndex: 0, phase: "results" });
		expect((await deps.games.findById("game-1"))?.locked).toBe(true);
	});
});

describe("removePlayer (spec 008)", () => {
	it("takes the player out of the list and tells the screens", async () => {
		const deps = await lobby();
		await deps.players.add(aPlayer({ id: "p1", nickname: "ACT" }));
		await deps.players.add(aPlayer({ id: "p2", nickname: "Bia" }));

		await createRemovePlayer(deps)({ ...mine, playerId: "p1" });

		expect(await deps.players.listActive("game-1")).toMatchObject([
			{ id: "p2" },
		]);
		expect(deps.realtime.messagesOn(gameChannel("game-1"))).toEqual([
			{
				channel: gameChannel("game-1"),
				event: GAME_EVENTS.playerRemoved,
				payload: { playerId: "p1" },
			},
		]);
	});

	it("removing twice publishes once", async () => {
		const deps = await lobby();
		await deps.players.add(aPlayer({ id: "p1" }));
		const removePlayer = createRemovePlayer(deps);

		await removePlayer({ ...mine, playerId: "p1" });
		await removePlayer({ ...mine, playerId: "p1" });

		expect(deps.realtime.messages).toHaveLength(1);
	});

	it("refuses a player of another game and another creator", async () => {
		const deps = await lobby();
		await deps.players.add(aPlayer({ id: "p1", gameId: "game-2" }));
		await deps.players.add(aPlayer({ id: "p2" }));
		const removePlayer = createRemovePlayer(deps);

		await expect(removePlayer({ ...mine, playerId: "p1" })).rejects.toThrow(
			GameNotFoundError,
		);
		await expect(
			removePlayer({ ownerId: "user-2", gameId: "game-1", playerId: "p2" }),
		).rejects.toThrow(GameNotFoundError);
	});
});

describe("endGame (spec 008)", () => {
	it("ends the game and tells the screens once", async () => {
		const deps = await lobby();
		const endGame = createEndGame(deps);

		await endGame(mine);
		await endGame(mine);

		expect(await deps.games.findById("game-1")).toMatchObject({
			status: "ended",
			endReason: "host",
			endedAt: deps.clock.now(),
		});
		expect(deps.realtime.messagesOn(gameChannel("game-1"))).toEqual([
			{
				channel: gameChannel("game-1"),
				event: GAME_EVENTS.gameEnded,
				payload: { reason: "host" },
			},
		]);
	});

	it("is not found for another creator", async () => {
		const deps = await lobby();

		await expect(
			createEndGame(deps)({ ownerId: "user-2", gameId: "game-1" }),
		).rejects.toThrow(GameNotFoundError);
	});
});
