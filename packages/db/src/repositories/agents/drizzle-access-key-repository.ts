import type { AccessKeyRepository } from "@quizio/core/agents/application/ports/access-key-repository";
import type { AccessKey } from "@quizio/core/agents/domain/access-key";
import { and, count, desc, eq, isNull, lt, or, sql } from "drizzle-orm";

import { accessKey as keyTable } from "../../schema/agents";
import type { Database } from "../../types";

type KeyRow = typeof keyTable.$inferSelect;

function toAccessKey(row: KeyRow): AccessKey {
	return {
		id: row.id,
		ownerId: row.userId,
		name: row.name,
		start: row.start,
		createdAt: row.createdAt,
		lastUsedAt: row.lastUsedAt,
	};
}

/**
 * Access keys of spec 044 (ADR 0023): the secret's hash only. Adding counts
 * and inserts under a lock on the owner, so two keys made at the same time
 * cannot both take the last place (RN-05).
 */
export function createDrizzleAccessKeyRepository(
	db: Database,
): AccessKeyRepository {
	return {
		async add(key, maxActive) {
			return db.transaction(async (tx) => {
				await tx.execute(
					sql`select pg_advisory_xact_lock(hashtext(${`access-key:${key.ownerId}`}))`,
				);
				const [row] = await tx
					.select({ owned: count() })
					.from(keyTable)
					.where(eq(keyTable.userId, key.ownerId));
				if ((row?.owned ?? 0) >= maxActive) {
					return "limit" as const;
				}
				await tx.insert(keyTable).values({
					id: key.id,
					userId: key.ownerId,
					name: key.name,
					start: key.start,
					secretHash: key.secretHash,
					createdAt: key.createdAt,
					lastUsedAt: key.lastUsedAt,
				});
				return "added" as const;
			});
		},

		async listFor(ownerId) {
			const rows = await db
				.select()
				.from(keyTable)
				.where(eq(keyTable.userId, ownerId))
				.orderBy(desc(keyTable.createdAt), desc(keyTable.id));
			return rows.map(toAccessKey);
		},

		async findByHash(secretHash) {
			const [row] = await db
				.select()
				.from(keyTable)
				.where(eq(keyTable.secretHash, secretHash));
			return row ? toAccessKey(row) : null;
		},

		async revoke(ownerId, keyId) {
			const deleted = await db
				.delete(keyTable)
				.where(and(eq(keyTable.id, keyId), eq(keyTable.userId, ownerId)))
				.returning({ id: keyTable.id });
			return deleted.length > 0;
		},

		async revokeAllFor(ownerId) {
			await db.delete(keyTable).where(eq(keyTable.userId, ownerId));
		},

		async markUsed(keyId, at, throttleMs) {
			await db
				.update(keyTable)
				.set({ lastUsedAt: at })
				.where(
					and(
						eq(keyTable.id, keyId),
						or(
							isNull(keyTable.lastUsedAt),
							lt(keyTable.lastUsedAt, new Date(at.getTime() - throttleMs)),
						),
					),
				);
		},
	};
}
