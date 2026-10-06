import { describe, expect, it } from "vitest";

import { aGame, aPlayingGame } from "../testing/a-game";
import {
	AUTOPLAY_ADVANCE_MS,
	AUTOPLAY_START_MS,
	autoAdvanceRemainingMs,
	autoAdvanceToken,
	autoStartRemainingMs,
	autoStartToken,
} from "./autoplay";
import { endGame } from "./game";
import type { GamePhase } from "./game-progress";

const now = new Date("2026-06-01T12:00:00.000Z");
const later = (ms: number) => new Date(now.getTime() + ms);

/** A lobby whose host turned autoplay on at `since`. */
const lobby = (since: Date | null = now, overrides = {}) =>
	aGame({ createdAt: now, autoplaySince: since, ...overrides });
/** One player, who got in at `at`. */
const joined = (at: Date, activePlayers = 1) => ({
	activePlayers,
	lastJoinedAt: at,
});
const empty = { activePlayers: 0, lastJoinedAt: null };

/** A game at `phase` since `now`, with autoplay on since `since`. */
const playing = (phase: GamePhase, since: Date | null = now) =>
	aPlayingGame(phase, { since: now }, { autoplaySince: since });

describe("autoplay: starting by itself (spec 014)", () => {
	it("no countdown without autoplay", () => {
		expect(autoStartRemainingMs(lobby(null), joined(now), now)).toBeNull();
		expect(autoStartToken(lobby(null), now)).toBeNull();
	});

	it("an empty lobby has no countdown", () => {
		expect(autoStartRemainingMs(lobby(), empty, later(30_000))).toBeNull();
	});

	it("counts 15 s from the last player", () => {
		const game = lobby();
		const ana = joined(later(2_000));

		expect(autoStartRemainingMs(game, ana, later(2_000))).toBe(
			AUTOPLAY_START_MS,
		);
		expect(autoStartRemainingMs(game, ana, later(8_000))).toBe(9_000);
		expect(autoStartRemainingMs(game, ana, later(17_000))).toBe(0);
		expect(AUTOPLAY_START_MS).toBe(15_000);
	});

	it("a player who joins restarts the countdown", () => {
		const game = lobby();
		// Ana at 2 s; Bia at 11 s, with 6 s left.
		expect(
			autoStartRemainingMs(game, joined(later(2_000)), later(11_000)),
		).toBe(6_000);
		expect(
			autoStartRemainingMs(game, joined(later(11_000), 2), later(11_000)),
		).toBe(AUTOPLAY_START_MS);
	});

	it("counts from when autoplay was turned on, if that is later", () => {
		// Ana has been in the lobby for a minute when the switch is turned.
		const game = lobby(later(60_000));

		expect(autoStartRemainingMs(game, joined(now), later(60_000))).toBe(
			AUTOPLAY_START_MS,
		);
		expect(autoStartRemainingMs(game, joined(now), later(70_000))).toBe(5_000);
	});

	it("removing the last player stops the countdown, and the next one starts another", () => {
		const game = lobby();
		// Ana got in at 2 s and was removed: nobody is in, though she is the last who joined.
		expect(
			autoStartRemainingMs(
				game,
				{ activePlayers: 0, lastJoinedAt: later(2_000) },
				later(9_000),
			),
		).toBeNull();
		// Bia gets in at 20 s.
		expect(
			autoStartRemainingMs(game, joined(later(20_000)), later(20_000)),
		).toBe(AUTOPLAY_START_MS);
	});

	it("removing one of several leaves the countdown", () => {
		const game = lobby();
		// Bia, the last to get in (at 5 s), was removed; Ana is still there.
		expect(
			autoStartRemainingMs(game, joined(later(5_000), 1), later(12_000)),
		).toBe(8_000);
	});

	it("a locked game keeps counting", () => {
		const game = lobby(now, { locked: true });

		expect(autoStartRemainingMs(game, joined(now), later(3_000))).toBe(12_000);
	});

	it("never tells a negative time", () => {
		expect(autoStartRemainingMs(lobby(), joined(now), later(60_000))).toBe(0);
	});

	it("a game that left the lobby has no countdown to start", () => {
		expect(
			autoStartRemainingMs(playing("gameIntro"), joined(now), now),
		).toBeNull();
		expect(
			autoStartRemainingMs(endGame(lobby(), "host", now), joined(now), now),
		).toBeNull();
	});

	it("another instant is another token", () => {
		const game = lobby();
		const first = autoStartToken(game, later(2_000));

		expect(first).not.toBeNull();
		expect(autoStartToken(game, later(2_000))).toBe(first);
		expect(autoStartToken(game, later(11_000))).not.toBe(first);
		expect(autoStartToken(lobby(later(30_000)), later(2_000))).not.toBe(first);
	});
});

describe("autoplay: moving on by itself (spec 014)", () => {
	it("the results and the scoreboard count 5 s from the phase's start", () => {
		for (const phase of ["results", "scoreboard"] as const) {
			const game = playing(phase);

			expect(autoAdvanceRemainingMs(game, now)).toBe(AUTOPLAY_ADVANCE_MS);
			expect(autoAdvanceRemainingMs(game, later(3_200))).toBe(1_800);
			expect(autoAdvanceRemainingMs(game, later(9_000))).toBe(0);
		}
		expect(AUTOPLAY_ADVANCE_MS).toBe(5_000);
	});

	it("turned on during the results, counts 5 s from then", () => {
		// The results have been on the screen for 40 s.
		const game = playing("results", later(40_000));

		expect(autoAdvanceRemainingMs(game, later(40_000))).toBe(
			AUTOPLAY_ADVANCE_MS,
		);
		expect(autoAdvanceRemainingMs(game, later(43_000))).toBe(2_000);
	});

	it("off, the results have no deadline", () => {
		expect(
			autoAdvanceRemainingMs(playing("results", null), later(60_000)),
		).toBeNull();
		expect(autoAdvanceToken(playing("results", null))).toBeNull();
	});

	it("the other phases have no automatic countdown", () => {
		for (const phase of ["gameIntro", "questionIntro", "answering"] as const) {
			expect(autoAdvanceRemainingMs(playing(phase), later(1_000))).toBeNull();
			expect(autoAdvanceToken(playing(phase))).toBeNull();
		}
	});

	it("a lobby and a finished game have no countdown", () => {
		const finished = aGame({
			status: "finished",
			endedAt: now,
			autoplaySince: now,
		});

		expect(autoAdvanceRemainingMs(lobby(), now)).toBeNull();
		expect(autoAdvanceRemainingMs(finished, later(30_000))).toBeNull();
		expect(
			autoStartRemainingMs(finished, joined(now), later(30_000)),
		).toBeNull();
	});

	it("another instant is another token", () => {
		const first = autoAdvanceToken(playing("results"));

		expect(first).not.toBeNull();
		expect(autoAdvanceToken(playing("results"))).toBe(first);
		// Turned off and on again.
		expect(autoAdvanceToken(playing("results", later(2_000)))).not.toBe(first);
	});
});
