import { describe, expect, it } from "vitest";

import { AUTOPLAY_ADVANCE_MS, AUTOPLAY_START_MS } from "../domain/autoplay";
import { DEFAULT_GAME_OPTIONS } from "../domain/game-options";
import { StageNotDueError } from "../domain/game-progress";
import { aGame } from "../testing/a-game";
import { createGameDeps } from "../testing/game-deps";
import { createStartedGame } from "../testing/started-game";
import { createAdvanceGame } from "./advance-game";
import { createGetHostGame } from "./get-host-game";
import { createGetPlayerSession } from "./get-player-session";
import { createJoinGame } from "./join-game";
import { createRemovePlayer } from "./remove-player";
import { createSetGameOptions } from "./set-game-options";
import { createStartGame } from "./start-game";

const mine = { ownerId: "user-1", gameId: "game-1" };

/** A lobby of user-1, with autoplay on (or off) since the game was created. */
async function lobby(autoplay = true) {
	const deps = createGameDeps();
	await deps.games.save(
		aGame({
			createdAt: deps.clock.now(),
			options: { ...DEFAULT_GAME_OPTIONS, autoplay },
		}),
	);
	const join = (nickname: string) =>
		createJoinGame(deps)({ gameId: "game-1", nickname });
	const view = () => createGetHostGame(deps)(mine);
	return { deps, join, view };
}

describe("autoplay in the lobby: the host's view (spec 014)", () => {
	it("tells the lobby's countdown with autoplay and a player", async () => {
		const { deps, join, view } = await lobby();
		deps.clock.advanceBy(2_000);
		await join("Ana");

		expect((await view()).autoStart).toEqual({
			remainingMs: AUTOPLAY_START_MS,
			token: expect.any(String),
		});
	});

	it("tells no countdown for an empty lobby or without autoplay", async () => {
		const empty = await lobby();
		empty.deps.clock.advanceBy(30_000);
		expect((await empty.view()).autoStart).toBeNull();

		const off = await lobby(false);
		await off.join("Ana");
		off.deps.clock.advanceBy(30_000);
		expect((await off.view()).autoStart).toBeNull();
	});

	it("tells the time really left of the lobby's countdown", async () => {
		const { deps, join, view } = await lobby();
		await join("Ana");
		deps.clock.advanceBy(7_000);

		// A reload shows the countdown from where it is, not from 15 s.
		expect((await view()).autoStart?.remainingMs).toBe(8_000);

		deps.clock.advanceBy(60_000);
		expect((await view()).autoStart?.remainingMs).toBe(0);
	});

	it("a player who joins restarts the countdown, with another token", async () => {
		const { deps, join, view } = await lobby();
		await join("Ana");
		deps.clock.advanceBy(9_000);
		const before = (await view()).autoStart;

		await join("Bia");
		const after = (await view()).autoStart;

		expect(before?.remainingMs).toBe(6_000);
		expect(after?.remainingMs).toBe(AUTOPLAY_START_MS);
		expect(after?.token).not.toBe(before?.token);
	});

	it("removing one of several leaves the countdown", async () => {
		const { deps, join, view } = await lobby();
		await join("Ana");
		deps.clock.advanceBy(3_000);
		const bia = await join("Bia");
		deps.clock.advanceBy(4_000);
		const before = (await view()).autoStart;

		// Bia was the last to get in.
		await createRemovePlayer(deps)({ ...mine, playerId: bia.playerId });

		expect((await view()).autoStart).toEqual(before);
		expect(before?.remainingMs).toBe(11_000);
	});

	it("removing the last player stops it, and the next one starts another", async () => {
		const { deps, join, view } = await lobby();
		const ana = await join("Ana");
		deps.clock.advanceBy(7_000);

		await createRemovePlayer(deps)({ ...mine, playerId: ana.playerId });
		expect((await view()).autoStart).toBeNull();

		deps.clock.advanceBy(20_000);
		expect((await view()).autoStart).toBeNull();
		await join("Bia");
		expect((await view()).autoStart?.remainingMs).toBe(AUTOPLAY_START_MS);
	});

	it("turning autoplay on with players in the lobby counts from then, and off cancels", async () => {
		const { deps, join, view } = await lobby(false);
		await join("Ana");
		deps.clock.advanceBy(60_000);
		const setGameOptions = createSetGameOptions(deps);

		const on = await setGameOptions({ ...mine, options: { autoplay: true } });
		expect(on.autoStart?.remainingMs).toBe(AUTOPLAY_START_MS);

		deps.clock.advanceBy(10_000);
		expect((await view()).autoStart?.remainingMs).toBe(5_000);

		const off = await setGameOptions({ ...mine, options: { autoplay: false } });
		expect(off.autoStart).toBeNull();
	});
});

describe("autoplay in the lobby: starting by itself (spec 014)", () => {
	it("an automatic start goes through once the countdown is over", async () => {
		const { deps, join } = await lobby();
		await join("Ana");
		deps.clock.advanceBy(AUTOPLAY_START_MS);

		const view = await createStartGame(deps)({ ...mine, auto: true });

		expect(view).toMatchObject({
			status: "playing",
			stage: { phase: "gameIntro" },
			autoStart: null,
		});
	});

	it("an automatic start before the new deadline is refused", async () => {
		const { deps, join } = await lobby();
		await join("Ana");
		deps.clock.advanceBy(14_000);
		// Bia gets in at the last moment: the screen still has the old countdown.
		await join("Bia");
		deps.clock.advanceBy(1_000);
		const startGame = createStartGame(deps);

		await expect(startGame({ ...mine, auto: true })).rejects.toBeInstanceOf(
			StageNotDueError,
		);
		expect((await deps.games.findById("game-1"))?.status).toBe("lobby");

		deps.clock.advanceBy(14_000);
		expect(await startGame({ ...mine, auto: true })).toMatchObject({
			status: "playing",
		});
	});

	it("an automatic start without autoplay is refused", async () => {
		const { deps, join } = await lobby(false);
		await join("Ana");
		deps.clock.advanceBy(60_000);

		await expect(
			createStartGame(deps)({ ...mine, auto: true }),
		).rejects.toBeInstanceOf(StageNotDueError);
		expect((await deps.games.findById("game-1"))?.status).toBe("lobby");
	});

	it("Iniciar starts before the countdown ends, once", async () => {
		const { deps, join } = await lobby();
		await join("Ana");
		deps.clock.advanceBy(6_000);
		const startGame = createStartGame(deps);

		expect(await startGame(mine)).toMatchObject({ status: "playing" });
		const published = deps.realtime.messages.length;

		// The countdown's own request arrives after: nothing more happens.
		deps.clock.advanceBy(9_000);
		expect(await startGame({ ...mine, auto: true })).toMatchObject({
			status: "playing",
			stage: { questionIndex: 0, phase: "gameIntro" },
		});
		expect(deps.realtime.messages).toHaveLength(published);
	});
});

describe("autoplay during the game (spec 014)", () => {
	const autoplay = { options: { autoplay: true } };
	const results = { questionIndex: 0, phase: "results" } as const;
	const scoreboard = { questionIndex: 0, phase: "scoreboard" } as const;

	it("tells the results' and the scoreboard's countdown, by the server's clock", async () => {
		const { deps, host, reach } = await createStartedGame(autoplay);
		const getHostGame = createGetHostGame(deps);
		await reach("results");

		expect((await getHostGame(host)).stage?.autoAdvance).toEqual({
			remainingMs: AUTOPLAY_ADVANCE_MS,
			token: expect.any(String),
		});
		// A reload two seconds in shows what is really left.
		deps.clock.advanceBy(2_000);
		expect((await getHostGame(host)).stage?.autoAdvance?.remainingMs).toBe(
			3_000,
		);

		await reach("scoreboard");
		expect((await getHostGame(host)).stage?.autoAdvance?.remainingMs).toBe(
			AUTOPLAY_ADVANCE_MS,
		);
	});

	it("tells no countdown in the other phases, in the lobby's place or without autoplay", async () => {
		const on = await createStartedGame(autoplay);
		await on.reach("answering");
		expect(await createGetHostGame(on.deps)(on.host)).toMatchObject({
			autoStart: null,
			stage: { phase: "answering", autoAdvance: null },
		});

		const off = await createStartedGame();
		await off.reach("results");
		expect(
			(await createGetHostGame(off.deps)(off.host)).stage?.autoAdvance,
		).toBeNull();
	});

	it("the token changes when the countdown starts over", async () => {
		const { deps, host, reach } = await createStartedGame(autoplay);
		const setGameOptions = createSetGameOptions(deps);
		await reach("results");
		const first = (await createGetHostGame(deps)(host)).stage?.autoAdvance;

		deps.clock.advanceBy(2_000);
		const off = await setGameOptions({ ...host, options: { autoplay: false } });
		expect(off.stage?.autoAdvance).toBeNull();

		deps.clock.advanceBy(38_000);
		const on = await setGameOptions({ ...host, options: { autoplay: true } });

		// Turned on 40 s into the results: 5 s from then.
		expect(on.stage?.autoAdvance?.remainingMs).toBe(AUTOPLAY_ADVANCE_MS);
		expect(on.stage?.autoAdvance?.token).not.toBe(first?.token);
	});

	it("with autoplay, refuses to leave the results before 5 s", async () => {
		const { deps, host, reach, stage, advance } =
			await createStartedGame(autoplay);
		await reach("results");
		deps.clock.advanceBy(4_000);

		await expect(advance({ ...host, from: results })).rejects.toBeInstanceOf(
			StageNotDueError,
		);
		expect(await stage()).toEqual(results);
	});

	it("with autoplay, walks results and scoreboard by their deadlines", async () => {
		const { deps, host, reach, stage, advance } =
			await createStartedGame(autoplay);
		await reach("results");

		deps.clock.advanceBy(AUTOPLAY_ADVANCE_MS);
		await advance({ ...host, from: results });
		expect(await stage()).toEqual(scoreboard);

		await expect(advance({ ...host, from: scoreboard })).rejects.toBeInstanceOf(
			StageNotDueError,
		);
		deps.clock.advanceBy(AUTOPLAY_ADVANCE_MS);
		await advance({ ...host, from: scoreboard });
		expect(await stage()).toEqual({ questionIndex: 1, phase: "questionIntro" });
	});

	it("the last results finish the game by themselves", async () => {
		const { deps, host, reach, stored } = await createStartedGame(autoplay);
		await reach("results", 1);
		deps.clock.advanceBy(AUTOPLAY_ADVANCE_MS);

		const view = await createAdvanceGame(deps)({
			...host,
			from: { questionIndex: 1, phase: "results" },
		});

		expect(view).toMatchObject({ status: "finished", stage: null });
		expect(view.final?.standings).toHaveLength(2);
		expect((await stored()).status).toBe("finished");
	});

	it("without autoplay the results still wait for the host", async () => {
		const { deps, host, reach, stage, advance } = await createStartedGame();
		await reach("results");
		deps.clock.advanceBy(120_000);
		expect(await stage()).toEqual(results);

		await advance({ ...host, from: results });

		expect(await stage()).toEqual(scoreboard);
	});

	it("the player's session has no countdown and no deadline in the results", async () => {
		const { deps, reach } = await createStartedGame(autoplay);
		await reach("results");

		const session = await createGetPlayerSession(deps)({
			gameId: "game-1",
			playerId: "p1",
			secret: "s1",
		});

		expect(session.stage).toMatchObject({
			phase: "results",
			remainingMs: null,
			durationMs: null,
		});
		expect(JSON.stringify(session)).not.toMatch(
			/autoAdvance|autoStart|autoplay/,
		);
	});
});
