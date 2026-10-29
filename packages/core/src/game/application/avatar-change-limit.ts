import type { AttemptLimiter } from "../../shared/application/ports/attempt-limiter";
import type { Clock } from "../../shared/application/ports/clock";
import {
	AVATAR_CHANGE_LIMIT,
	AVATAR_CHANGE_WINDOW_MS,
	TooManyAvatarChangesError,
} from "../domain/avatar";

/**
 * Takes one of the avatar changes a player may make in the window (spec 028,
 * RN-12a): a loop of taps cannot turn into writes and events without end.
 */
export async function reserveAvatarChange(
	deps: { attempts: AttemptLimiter; clock: Clock },
	playerId: string,
): Promise<void> {
	const allowed = await deps.attempts.reserve(
		`avatar:${playerId}`,
		AVATAR_CHANGE_WINDOW_MS,
		AVATAR_CHANGE_LIMIT,
		deps.clock.now(),
	);
	if (!allowed) {
		throw new TooManyAvatarChangesError(
			"Too many avatar changes; wait a moment",
		);
	}
}
