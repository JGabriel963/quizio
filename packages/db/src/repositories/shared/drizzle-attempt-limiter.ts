import type { AttemptLimiter } from "@quizio/core/shared/application/ports/attempt-limiter";
import { and, eq, sql } from "drizzle-orm";

import { attemptWindow as windowTable } from "../../schema/shared";
import type { Database } from "../../types";

const windowStart = (windowMs: number, now: Date) =>
	new Date(Math.floor(now.getTime() / windowMs) * windowMs);

export function createDrizzleAttemptLimiter(db: Database): AttemptLimiter {
	return {
		async count(key, windowMs, now) {
			const [row] = await db
				.select({ count: windowTable.count })
				.from(windowTable)
				.where(
					and(
						eq(windowTable.key, key),
						eq(windowTable.windowStartedAt, windowStart(windowMs, now)),
					),
				)
				.limit(1);
			return row?.count ?? 0;
		},

		async record(key, windowMs, now) {
			const startedAt = windowStart(windowMs, now);
			// One statement, so concurrent attempts are all counted.
			await db
				.insert(windowTable)
				.values({ key, windowStartedAt: startedAt, count: 1 })
				.onConflictDoUpdate({
					target: windowTable.key,
					set: {
						windowStartedAt: startedAt,
						count: sql`case when ${windowTable.windowStartedAt} = excluded.window_started_at then ${windowTable.count} + 1 else 1 end`,
					},
				});
		},
	};
}
