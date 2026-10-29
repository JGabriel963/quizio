import type { AttemptLimiter } from "../../shared/application/ports/attempt-limiter";
import {
	JOIN_LIMIT_PER_NETWORK,
	JOIN_WINDOW_MS,
	TooManyJoinsError,
} from "../domain/game";

/**
 * Takes one of the joins a network address may make in a game in each window
 * (spec 008, RN-45a; spec 030, RN-04a), before the player is added, so joins
 * sent at the same time cannot all get in under the limit. The function it
 * returns gives the join back, for one that was refused.
 */
export async function reserveJoin(
	attempts: AttemptLimiter,
	gameId: string,
	clientKey: string,
	now: Date,
): Promise<() => Promise<void>> {
	const key = `join:${gameId}:${clientKey}`;
	const allowed = await attempts.reserve(
		key,
		JOIN_WINDOW_MS,
		JOIN_LIMIT_PER_NETWORK,
		now,
	);
	if (!allowed) {
		throw new TooManyJoinsError(
			"Too many players from this network; wait a moment",
		);
	}
	return () => attempts.release(key, JOIN_WINDOW_MS, now);
}
