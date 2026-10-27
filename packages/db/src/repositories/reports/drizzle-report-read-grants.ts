import type { ReportReadGrants } from "@quizio/core/reports/application/ports/report-read-grants";
import { and, eq } from "drizzle-orm";

import { groupMember, groupPost } from "../../schema/groups";
import type { Database } from "../../types";

/**
 * A report may be read by the admin of a group where its assignment is
 * posted (spec 038, RN-20a; ADR 0016).
 */
export function createDrizzleReportReadGrants(db: Database): ReportReadGrants {
	return {
		async canRead(viewerId, gameId) {
			const [row] = await db
				.select({ postId: groupPost.id })
				.from(groupPost)
				.innerJoin(
					groupMember,
					and(
						eq(groupMember.groupId, groupPost.groupId),
						eq(groupMember.userId, viewerId),
						eq(groupMember.role, "admin"),
					),
				)
				.where(eq(groupPost.gameId, gameId))
				.limit(1);
			return row !== undefined;
		},
	};
}
