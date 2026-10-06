import type { AttemptLimiter } from "@quizio/core/shared/application/ports/attempt-limiter";
import { and, eq, gt, sql } from "drizzle-orm";

import { attemptWindow as windowTable } from "../../schema/shared";
import type { Database } from "../../types";

const windowStart = (windowMs: number, now: Date) =>
	new Date(Math.floor(now.getTime() / windowMs) * windowMs);

export function createDrizzleAttemptLimiter(db: Database): AttemptLimiter {
	return {
		async reserve(key, windowMs, limit, now) {
			const startedAt = windowStart(windowMs, now);
			// One statement: the row is written only while the window has room,
			// so attempts at the same time cannot all read the same count.
			const taken = await db
				.insert(windowTable)
				.values({ key, windowStartedAt: startedAt, count: 1 })
				.onConflictDoUpdate({
					target: windowTable.key,
					set: {
						windowStartedAt: startedAt,
						count: sql`case when ${windowTable.windowStartedAt} = excluded.window_started_at then ${windowTable.count} + 1 else 1 end`,
					},
					setWhere: sql`${windowTable.windowStartedAt} <> excluded.window_started_at or ${windowTable.count} < ${limit}`,
				})
				.returning({ key: windowTable.key });
			return taken.length > 0;
		},

		async release(key, windowMs, now) {
			await db
				.update(windowTable)
				.set({ count: sql`${windowTable.count} - 1` })
				.where(
					and(
						eq(windowTable.key, key),
						eq(windowTable.windowStartedAt, windowStart(windowMs, now)),
						gt(windowTable.count, 0),
					),
				);
		},
	};
}
