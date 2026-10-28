import type { ThemeUploadRepository } from "@quizio/core/themes/application/ports/theme-upload-repository";
import { and, asc, eq, inArray, lt } from "drizzle-orm";

import { themeUpload } from "../../schema/themes";
import type { Database } from "../../types";

/** The theme files nobody saved yet (spec 043, RN-29). */
export function createDrizzleThemeUploadRepository(
	db: Database,
): ThemeUploadRepository {
	return {
		async addThemeUpload(upload) {
			await db.insert(themeUpload).values(upload).onConflictDoNothing();
		},

		async removeThemeUpload(key, ownerId) {
			const removed = await db
				.delete(themeUpload)
				.where(and(eq(themeUpload.key, key), eq(themeUpload.ownerId, ownerId)))
				.returning({ key: themeUpload.key });
			return removed.length > 0;
		},

		async takeExpiredThemeUploads(before, limit) {
			// One statement: two sweeps at the same time never take the same row.
			const oldest = db
				.select({ key: themeUpload.key })
				.from(themeUpload)
				.where(lt(themeUpload.createdAt, before))
				.orderBy(asc(themeUpload.createdAt))
				.limit(limit);
			const taken = await db
				.delete(themeUpload)
				.where(inArray(themeUpload.key, oldest))
				.returning({ key: themeUpload.key, createdAt: themeUpload.createdAt });
			return taken
				.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
				.map(({ key }) => key);
		},
	};
}
