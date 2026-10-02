import { type Game, isGameOpen } from "./game";

/** How often the host's screen tells the server it is there (spec 013). */
export const HOST_SIGNAL_INTERVAL_MS = 4_000;

/**
 * Without a signal for this long, the host counts as away (RN-14): two signals
 * in a row were missed, by a lost connection or a closed tab.
 */
export const HOST_AWAY_AFTER_MS = 10_000;

/**
 * How long ago the host's screen last gave a sign. Null once the game is over:
 * nobody waits for the host then (RN-19).
 */
export function hostIdleMs(game: Game, now: Date): number | null {
	if (!isGameOpen(game)) {
		return null;
	}
	return Math.max(0, now.getTime() - game.hostSeenAt.getTime());
}

export function isHostAway(game: Game, now: Date): boolean {
	const idleMs = hostIdleMs(game, now);
	return idleMs !== null && idleMs >= HOST_AWAY_AFTER_MS;
}
