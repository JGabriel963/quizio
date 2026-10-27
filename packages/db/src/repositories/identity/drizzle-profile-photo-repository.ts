import type { ProfilePhotoRepository } from "@quizio/core/identity/application/ports/profile-photo-repository";
import { eq, inArray } from "drizzle-orm";

import { profilePhoto } from "../../schema/identity";
import type { Database } from "../../types";

/** One key per user (spec 039; ADR 0019). */
export function createDrizzleProfilePhotoRepository(
	db: Database,
): ProfilePhotoRepository {
	async function keyOf(userId: string): Promise<string | null> {
		const [row] = await db
			.select({ key: profilePhoto.key })
			.from(profilePhoto)
			.where(eq(profilePhoto.userId, userId))
			.limit(1);
		return row?.key ?? null;
	}

	return {
		keyOf,

		async keysOf(userIds) {
			if (userIds.length === 0) {
				return new Map();
			}
			const rows = await db
				.select({ userId: profilePhoto.userId, key: profilePhoto.key })
				.from(profilePhoto)
				.where(inArray(profilePhoto.userId, [...userIds]));
			return new Map(rows.map((row) => [row.userId, row.key]));
		},

		async save(userId, key) {
			const previous = await keyOf(userId);
			await db
				.insert(profilePhoto)
				.values({ userId, key, updatedAt: new Date() })
				.onConflictDoUpdate({
					target: profilePhoto.userId,
					set: { key, updatedAt: new Date() },
				});
			return previous;
		},

		async remove(userId) {
			const [row] = await db
				.delete(profilePhoto)
				.where(eq(profilePhoto.userId, userId))
				.returning({ key: profilePhoto.key });
			return row?.key ?? null;
		},
	};
}
