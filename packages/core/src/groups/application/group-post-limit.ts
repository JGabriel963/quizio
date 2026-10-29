import type { AttemptLimiter } from "../../shared/application/ports/attempt-limiter";
import type { Clock } from "../../shared/application/ports/clock";
import { TooManyGroupPostsError } from "../domain/group-errors";
import {
	GROUP_POSTS_PER_DAY,
	GROUP_POSTS_PER_MINUTE,
} from "../domain/group-post";

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

export interface GroupPostLimitDeps {
	attempts: AttemptLimiter;
	clock: Clock;
}

/**
 * Takes one of the posts a person may make, in the minute and in the day
 * (audit L9), before anything is written.
 */
export async function reserveGroupPost(
	deps: GroupPostLimitDeps,
	userId: string,
): Promise<void> {
	const now = deps.clock.now();
	for (const [window, limit] of [
		[MINUTE_MS, GROUP_POSTS_PER_MINUTE],
		[DAY_MS, GROUP_POSTS_PER_DAY],
	] as const) {
		if (
			!(await deps.attempts.reserve(
				`group-post:${window}:${userId}`,
				window,
				limit,
				now,
			))
		) {
			throw new TooManyGroupPostsError();
		}
	}
}
