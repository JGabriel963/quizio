import type { GenerationQuota } from "@quizio/core/quiz/application/ports/generation-quota";
import { and, eq, gt, lte, min, type SQL, sql, sum } from "drizzle-orm";

import { generationUsage as usageTable } from "../../schema/quiz";
import type { Database } from "../../types";

function inWindow(ownerId: string | null, windowMs: number, now: Date) {
	const conditions: SQL[] = [
		gt(usageTable.createdAt, new Date(now.getTime() - windowMs)),
		lte(usageTable.createdAt, now),
	];
	if (ownerId !== null) {
		conditions.push(eq(usageTable.ownerId, ownerId));
	}
	return and(...conditions);
}

/**
 * The credits in the window: the owner's `credits`, or everybody's
 * `instance_credits` with null; and when the oldest use was taken.
 */
async function usageOf(
	db: Pick<Database, "select">,
	ownerId: string | null,
	windowMs: number,
	now: Date,
) {
	const column =
		ownerId === null ? usageTable.instanceCredits : usageTable.credits;
	const [row] = await db
		.select({ used: sum(column), oldestAt: min(usageTable.createdAt) })
		.from(usageTable)
		.where(inWindow(ownerId, windowMs, now));
	return { used: Number(row?.used ?? 0), oldestAt: row?.oldestAt ?? null };
}

/**
 * The creation assistant's credits (spec 045), one row per creation. A
 * reservation sums and inserts under one lock for the whole instance, so two
 * requests at the same time cannot both take the last credits, the owner's or
 * everybody's; creations are few, so they can wait for each other here.
 */
export function createDrizzleGenerationQuota(db: Database): GenerationQuota {
	return {
		async reserve(ownerId, credits, limits, windowMs, now) {
			return db.transaction(async (tx) => {
				await tx.execute(
					sql`select pg_advisory_xact_lock(hashtext(${"generation"}))`,
				);
				const everybody = await usageOf(tx, null, windowMs, now);
				const owner = await usageOf(tx, ownerId, windowMs, now);
				const limited =
					everybody.used + credits > limits.instance
						? { usage: everybody, limitedBy: "instance" as const }
						: owner.used + credits > limits.perOwner
							? { usage: owner, limitedBy: "owner" as const }
							: null;
				if (limited) {
					return {
						reserved: false as const,
						nextAvailableAt: new Date(
							(limited.usage.oldestAt ?? now).getTime() + windowMs,
						),
						limitedBy: limited.limitedBy,
					};
				}
				const id = crypto.randomUUID();
				await tx.insert(usageTable).values({
					id,
					ownerId,
					createdAt: now,
					credits,
					instanceCredits: credits,
				});
				return { reserved: true as const, id };
			});
		},

		async settle(id, { charged, spent }) {
			await db
				.update(usageTable)
				.set({ credits: charged, instanceCredits: spent })
				.where(eq(usageTable.id, id));
		},

		async release(id) {
			await db.delete(usageTable).where(eq(usageTable.id, id));
		},

		usage(ownerId, windowMs, now) {
			return usageOf(db, ownerId, windowMs, now);
		},
	};
}
