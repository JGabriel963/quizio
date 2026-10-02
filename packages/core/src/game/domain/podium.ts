import type { Game } from "./game";

/** How many players the podium shows (spec 011, RN-08). */
export const PODIUM_SIZE = 3;

/**
 * When each place shows, from the instant the game finished (RN-10): the
 * first one waits longer than the others.
 */
export const PODIUM_REVEAL_MS = { 3: 2_000, 2: 4_000, 1: 7_000 } as const;

/** The reveal is over once the first place shows. */
export const PODIUM_REVEAL_TOTAL_MS = PODIUM_REVEAL_MS[1];

/**
 * Time left of the podium's reveal, by the server's clock (RN-11); 0 once it
 * is over, and for a game that did not finish.
 */
export function podiumRevealRemainingMs(game: Game, now: Date): number {
	if (game.status !== "finished" || !game.endedAt) {
		return 0;
	}
	const elapsed = Math.max(0, now.getTime() - game.endedAt.getTime());
	return Math.max(0, PODIUM_REVEAL_TOTAL_MS - elapsed);
}
