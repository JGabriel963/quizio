import type { SourceUploadRepository } from "@quizio/core/media/application/ports/source-upload-repository";
import { asc, eq, inArray, lt } from "drizzle-orm";

import { sourceUpload } from "../../schema/media";
import type { Database } from "../../types";

export function createDrizzleSourceUploadRepository(
	db: Database,
): SourceUploadRepository {
	return {
		async add(upload) {
			await db.insert(sourceUpload).values(upload).onConflictDoNothing();
		},

		async remove(key) {
			await db.delete(sourceUpload).where(eq(sourceUpload.key, key));
		},

		async takeExpired(before, limit) {
			// One statement: two sweeps at the same time never take the same row.
			const oldest = db
				.select({ key: sourceUpload.key })
				.from(sourceUpload)
				.where(lt(sourceUpload.createdAt, before))
				.orderBy(asc(sourceUpload.createdAt))
				.limit(limit);
			const taken = await db
				.delete(sourceUpload)
				.where(inArray(sourceUpload.key, oldest))
				.returning({
					key: sourceUpload.key,
					createdAt: sourceUpload.createdAt,
				});
			return taken
				.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
				.map(({ key }) => key);
		},
	};
}
