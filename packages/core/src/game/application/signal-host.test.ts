import { describe, expect, it } from "vitest";

import { GAME_TTL_MS, GameNotFoundError } from "../domain/game";
import { GAME_EVENTS, gameChannel } from "../domain/game-events";
import { HOST_AWAY_AFTER_MS } from "../domain/host-presence";
import { aGame } from "../testing/a-game";
import { createGameDeps } from "../testing/game-deps";
import { createStartedGame } from "../testing/started-game";
import { createSetGameOptions } from "./set-game-options";
import { createSignalHost } from "./signal-host";

const mine = { ownerId: "user-1", gameId: "game-1" };

async function lobby() {
	const deps = createGameDeps();
	const now = deps.clock.now();
	await deps.games.save(aGame({ createdAt: now, hostSeenAt: now }));
	return deps;
}

type Deps = Awaited<ReturnType<typeof lobby>>;

const hostBackEvents = (deps: Pick<Deps, "realtime">) =>
	deps.realtime
		.messagesOn(gameChannel("game-1"))
		.filter((message) => message.event === GAME_EVENTS.hostBack);

describe("signalHost (spec 013)", () => {
	it("stores when the host gave a sign", async () => {
		const deps = await lobby();
		deps.clock.advanceBy(4_000);

		const answer = await createSignalHost(deps)(mine);

		expect(answer).toEqual({ status: "lobby" });
		expect((await deps.games.findById("game-1"))?.hostSeenAt).toEqual(
			deps.clock.now(),
		);
	});

	it("is not found for another creator", async () => {
		const deps = await lobby();
		const signalHost = createSignalHost(deps);

		await expect(
			signalHost({ ownerId: "user-2", gameId: "game-1" }),
		).rejects.toBeInstanceOf(GameNotFoundError);
		await expect(
			signalHost({ ownerId: "user-1", gameId: "nope" }),
		).rejects.toBeInstanceOf(GameNotFoundError);
	});

	it("publishes host-back only when the host was away", async () => {
		const deps = await lobby();
		const signalHost = createSignalHost(deps);
		deps.clock.advanceBy(HOST_AWAY_AFTER_MS);

		await signalHost(mine);

		expect(hostBackEvents(deps)).toEqual([
			{
				channel: gameChannel("game-1"),
				event: GAME_EVENTS.hostBack,
				payload: {},
			},
		]);

		// Back, the next signal is just another one.
		deps.clock.advanceBy(4_000);
		await signalHost(mine);

		expect(hostBackEvents(deps)).toHaveLength(1);
	});

	it("publishes nothing while the host keeps signalling", async () => {
		const deps = await lobby();
		const signalHost = createSignalHost(deps);

		for (let signals = 0; signals < 5; signals++) {
			deps.clock.advanceBy(4_000);
			await signalHost(mine);
		}

		expect(deps.realtime.messages).toEqual([]);
	});

	it("a signal never ends or moves the game", async () => {
		const { deps, host, reach, stage, stored } = await createStartedGame();
		await reach("answering");
		const before = await stored();
		deps.clock.advanceBy(60_000);

		const answer = await createSignalHost(deps)(host);

		expect(answer).toEqual({ status: "playing" });
		expect(await stage()).toEqual({ questionIndex: 0, phase: "answering" });
		expect(await stored()).toEqual({ ...before, hostSeenAt: deps.clock.now() });
	});

	it("does not undo a stage or a setting written meanwhile", async () => {
		const { deps, host, reach, stage } = await createStartedGame();
		await reach("answering");
		// The signal reads the game; the answers close and a switch is turned
		// before it writes.
		const findById = deps.games.findById.bind(deps.games);
		let raced = false;
		deps.games.findById = async (id) => {
			const game = await findById(id);
			if (!raced) {
				raced = true;
				await reach("results");
				await createSetGameOptions(deps)({
					...host,
					options: { showQuestionsOnDevices: true },
				});
			}
			return game;
		};

		await createSignalHost(deps)(host);

		expect(await stage()).toEqual({ questionIndex: 0, phase: "results" });
		expect(
			(await deps.games.findById("game-1"))?.options.showQuestionsOnDevices,
		).toBe(true);
	});

	it("tells the status of a game past its deadline, without marking the host present", async () => {
		const deps = await lobby();
		const seenAt = deps.clock.now();
		deps.clock.advanceBy(GAME_TTL_MS);

		const answer = await createSignalHost(deps)(mine);

		expect(answer).toEqual({ status: "ended" });
		expect(await deps.games.findById("game-1")).toMatchObject({
			status: "ended",
			endReason: "expired",
			hostSeenAt: seenAt,
		});
		expect(hostBackEvents(deps)).toEqual([]);
	});

	it("answers for a finished game without writing", async () => {
		const { deps, host, finish, stored } = await createStartedGame();
		await finish();
		const before = await stored();
		deps.clock.advanceBy(60_000);

		const answer = await createSignalHost(deps)(host);

		expect(answer).toEqual({ status: "finished" });
		expect(await stored()).toEqual(before);
		expect(hostBackEvents(deps)).toEqual([]);
	});
});
