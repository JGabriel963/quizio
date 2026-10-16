import type { GenerationQuota } from "@quizio/core/quiz/application/ports/generation-quota";
import { and, count, eq, gt, lte, min, sql } from "drizzle-orm";

import { generationUsage as usageTable } from "../../schema/quiz";
import type { Database } from "../../types";

function inWindow(ownerId: string, windowMs: number, now: Date) {
	return and(
		eq(usageTable.ownerId, ownerId),
		gt(usageTable.createdAt, new Date(now.getTime() - windowMs)),
		lte(usageTable.createdAt, now),
	);
}

async function usageOf(
	db: Pick<Database, "select">,
	ownerId: string,
	windowMs: number,
	now: Date,
) {
	const [row] = await db
		.select({ used: count(), oldestAt: min(usageTable.createdAt) })
		.from(usageTable)
		.where(inWindow(ownerId, windowMs, now));
	return { used: row?.used ?? 0, oldestAt: row?.oldestAt ?? null };
}

/**
 * The creation assistant's quota (spec 027, RN-31 to RN-33), one row per use.
 * A reservation counts and inserts under a lock on the owner, so two requests
 * at the same time cannot both take the last use.
 */
export function createDrizzleGenerationQuota(db: Database): GenerationQuota {
	return {
		async reserve(ownerId, limit, windowMs, now) {
			return db.transaction(async (tx) => {
				await tx.execute(
					sql`select pg_advisory_xact_lock(hashtext(${`generation:${ownerId}`}))`,
				);
				const { used, oldestAt } = await usageOf(tx, ownerId, windowMs, now);
				if (used >= limit) {
					return {
						reserved: false as const,
						nextAvailableAt: new Date((oldestAt ?? now).getTime() + windowMs),
					};
				}
				const id = crypto.randomUUID();
				await tx.insert(usageTable).values({ id, ownerId, createdAt: now });
				return { reserved: true as const, id };
			});
		},

		async release(id) {
			await db.delete(usageTable).where(eq(usageTable.id, id));
		},

		usage(ownerId, windowMs, now) {
			return usageOf(db, ownerId, windowMs, now);
		},
	};
}
