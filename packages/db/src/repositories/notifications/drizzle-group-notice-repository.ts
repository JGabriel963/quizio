import type { GroupNoticeRepository } from "@quizio/core/notifications/application/ports/group-notice-repository";

import { groupNotice } from "../../schema/notifications";
import type { Database } from "../../types";

/** Removals and deleted groups (spec 040, RN-06; ADR 0020). */
export function createDrizzleGroupNoticeRepository(
	db: Database,
): GroupNoticeRepository {
	return {
		async add(notices) {
			if (notices.length === 0) {
				return;
			}
			await db
				.insert(groupNotice)
				.values(
					notices.map(({ at, ...notice }) => ({ ...notice, createdAt: at })),
				)
				.onConflictDoNothing();
		},
	};
}
