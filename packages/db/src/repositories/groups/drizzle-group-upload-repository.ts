import type { GroupUploadRepository } from "@quizio/core/groups/application/ports/group-upload-repository";
import { and, asc, eq, inArray, lt } from "drizzle-orm";

import { groupUpload } from "../../schema/groups";
import type { Database } from "../../types";

/** The group files nobody posted yet (spec 036, RN-21; ADR 0017). */
export function createDrizzleGroupUploadRepository(
	db: Database,
): GroupUploadRepository {
	return {
		async addUpload({ file, ...upload }) {
			await db
				.insert(groupUpload)
				.values({
					...upload,
					fileType: file.type,
					fileName: file.name,
					fileSizeBytes: file.sizeBytes,
				})
				.onConflictDoNothing();
		},

		async removeUpload(key, uploaderId) {
			const removed = await db
				.delete(groupUpload)
				.where(
					and(eq(groupUpload.key, key), eq(groupUpload.uploaderId, uploaderId)),
				)
				.returning({ key: groupUpload.key });
			return removed.length > 0;
		},

		async takeExpiredUploads(before, limit) {
			// One statement: two sweeps at the same time never take the same row.
			const oldest = db
				.select({ key: groupUpload.key })
				.from(groupUpload)
				.where(lt(groupUpload.createdAt, before))
				.orderBy(asc(groupUpload.createdAt))
				.limit(limit);
			const taken = await db
				.delete(groupUpload)
				.where(inArray(groupUpload.key, oldest))
				.returning({ key: groupUpload.key, createdAt: groupUpload.createdAt });
			return taken
				.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
				.map(({ key }) => key);
		},

		async uploadKeysOfGroup(groupId) {
			const rows = await db
				.select({ key: groupUpload.key })
				.from(groupUpload)
				.where(eq(groupUpload.groupId, groupId));
			return rows.map(({ key }) => key);
		},

		async uploadKeysOfUser(userId) {
			const rows = await db
				.select({ key: groupUpload.key })
				.from(groupUpload)
				.where(eq(groupUpload.uploaderId, userId));
			return rows.map(({ key }) => key);
		},
	};
}
