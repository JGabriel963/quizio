import type { Game } from "./game";

/**
 * With autoplay, the lobby starts by itself this long after the last player
 * got in (spec 014, RN-05, RN-06).
 */
export const AUTOPLAY_START_MS = 15_000;

/** With autoplay, the results and the scoreboard stay this long (RN-11, RN-12). */
export const AUTOPLAY_ADVANCE_MS = 5_000;

/** The lobby as far as its countdown goes. */
export interface LobbyArrivals {
	activePlayers: number;
	/**
	 * When the last player got in, removed ones included: removing a player
	 * among several must not move the countdown (RN-07).
	 */
	lastJoinedAt: Date | null;
}

function laterOf(first: Date, second: Date): Date {
	return first > second ? first : second;
}

function leftOf(from: Date, durationMs: number, now: Date): number {
	return Math.max(0, from.getTime() + durationMs - now.getTime());
}

/**
 * The instant the lobby's countdown counts from: the last arrival, or the
 * switch being turned on if that came later (RN-08). Null without autoplay,
 * outside the lobby, or with nobody in it.
 */
function autoStartFrom(game: Game, lastJoinedAt: Date | null): Date | null {
	if (
		game.status !== "lobby" ||
		game.autoplaySince === null ||
		lastJoinedAt === null
	) {
		return null;
	}
	return laterOf(game.autoplaySince, lastJoinedAt);
}

/**
 * Time left for the lobby to start by itself, by the server's clock; null
 * when it is not counting.
 */
export function autoStartRemainingMs(
	game: Game,
	lobby: LobbyArrivals,
	now: Date,
): number | null {
	const from =
		lobby.activePlayers > 0 ? autoStartFrom(game, lobby.lastJoinedAt) : null;
	return from && leftOf(from, AUTOPLAY_START_MS, now);
}

/** Names the lobby's countdown: another instant to count from is another countdown. */
export function autoStartToken(
	game: Game,
	lastJoinedAt: Date | null,
): string | null {
	return autoStartFrom(game, lastJoinedAt)?.toISOString() ?? null;
}

/**
 * The instant the results or the scoreboard count from: the phase's start,
 * or the switch being turned on if that came later (RN-15). Null in the other
 * phases, which have their own time, and without autoplay.
 */
function autoAdvanceFrom(game: Game): Date | null {
	const { progress } = game;
	if (
		game.status !== "playing" ||
		progress === null ||
		game.autoplaySince === null ||
		(progress.phase !== "results" && progress.phase !== "scoreboard")
	) {
		return null;
	}
	return laterOf(game.autoplaySince, progress.phaseStartedAt);
}

/**
 * Time left for the results or the scoreboard to move on by themselves, by
 * the server's clock; null when they wait for the host.
 */
export function autoAdvanceRemainingMs(game: Game, now: Date): number | null {
	const from = autoAdvanceFrom(game);
	return from && leftOf(from, AUTOPLAY_ADVANCE_MS, now);
}

export function autoAdvanceToken(game: Game): string | null {
	return autoAdvanceFrom(game)?.toISOString() ?? null;
}
