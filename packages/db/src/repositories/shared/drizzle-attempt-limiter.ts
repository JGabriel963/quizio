import type { AttemptLimiter } from "@quizio/core/shared/application/ports/attempt-limiter";
import { and, eq, gt, inArray, lt, sql } from "drizzle-orm";

import { attemptWindow as windowTable } from "../../schema/shared";
import type { Database } from "../../types";

const windowStart = (windowMs: number, now: Date) =>
	new Date(Math.floor(now.getTime() / windowMs) * windowMs);

/** No limit counts over more than a day, so older windows count nothing. */
const STALE_AFTER_MS = 2 * 24 * 60 * 60 * 1000;
/** How many stale windows one sweep deletes, so it stays quick. */
const SWEEP_LIMIT = 500;

/**
 * Every key that ever made an attempt has a row, and a client changing its
 * address leaves one behind each time: one reserve in `sweepEvery` deletes a
 * few windows that ended days ago (audit L2).
 */
export function createDrizzleAttemptLimiter(
	db: Database,
	{ sweepEvery = 100 }: { sweepEvery?: number } = {},
): AttemptLimiter {
	let reserves = 0;

	async function sweep(now: Date) {
		const stale = db
			.select({ key: windowTable.key })
			.from(windowTable)
			.where(
				lt(
					windowTable.windowStartedAt,
					new Date(now.getTime() - STALE_AFTER_MS),
				),
			)
			.limit(SWEEP_LIMIT);
		await db.delete(windowTable).where(inArray(windowTable.key, stale));
	}

	return {
		async reserve(key, windowMs, limit, now) {
			reserves += 1;
			if (reserves % sweepEvery === 0) {
				await sweep(now);
			}
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
