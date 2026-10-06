import { describe, expect, it } from "vitest";

import { aGame, aPlayingGame } from "../testing/a-game";
import { endGame, newGame } from "./game";
import { DEFAULT_GAME_OPTIONS } from "./game-options";
import {
	HOST_AWAY_AFTER_MS,
	HOST_SIGNAL_INTERVAL_MS,
	hostIdleMs,
	isHostAway,
} from "./host-presence";

const now = new Date("2026-06-01T12:00:00.000Z");
const later = (ms: number) => new Date(now.getTime() + ms);

describe("host presence (spec 013)", () => {
	it("a new game has its host present", () => {
		const game = newGame({
			id: "game-1",
			ownerId: "user-1",
			quizId: "quiz-1",
			quizVersion: 1,
			title: "Capitais",
			pin: "265914",
			options: DEFAULT_GAME_OPTIONS,
			now,
		});

		expect(game.hostSeenAt).toEqual(now);
		expect(hostIdleMs(game, now)).toBe(0);
		expect(isHostAway(game, now)).toBe(false);
	});

	it("tells how long ago the host last gave a sign", () => {
		const game = aGame({ hostSeenAt: now });

		expect(hostIdleMs(game, later(3_200))).toBe(3_200);
		expect(
			hostIdleMs(
				aPlayingGame("answering", {}, { hostSeenAt: now }),
				later(700),
			),
		).toBe(700);
	});

	it("the host is away after 10 s without a signal", () => {
		const game = aPlayingGame("answering", {}, { hostSeenAt: now });

		expect(isHostAway(game, later(HOST_AWAY_AFTER_MS))).toBe(true);
		expect(isHostAway(game, later(60_000))).toBe(true);
	});

	it("a host silent for less than 10 s is not away", () => {
		const game = aPlayingGame("answering", {}, { hostSeenAt: now });

		expect(isHostAway(game, later(4_000))).toBe(false);
		expect(isHostAway(game, later(HOST_AWAY_AFTER_MS - 1))).toBe(false);
	});

	it("two signals fit in the time the host has before counting as away", () => {
		expect(HOST_SIGNAL_INTERVAL_MS * 2).toBeLessThan(HOST_AWAY_AFTER_MS);
	});

	it("never tells a negative time", () => {
		const game = aGame({ hostSeenAt: later(500) });

		expect(hostIdleMs(game, now)).toBe(0);
	});

	it("no idle time for a game that is over", () => {
		const finished = aGame({
			status: "finished",
			endedAt: now,
			hostSeenAt: now,
		});
		const ended = endGame(aGame({ hostSeenAt: now }), "host", now);

		expect(hostIdleMs(finished, later(60_000))).toBeNull();
		expect(hostIdleMs(ended, later(60_000))).toBeNull();
		expect(isHostAway(finished, later(60_000))).toBe(false);
		expect(isHostAway(ended, later(60_000))).toBe(false);
	});
});
