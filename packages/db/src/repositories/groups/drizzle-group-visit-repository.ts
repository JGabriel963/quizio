import type { GroupVisitRepository } from "@quizio/core/groups/application/ports/group-visit-repository";

import { groupVisit } from "../../schema/groups";
import type { Database } from "../../types";

export function createDrizzleGroupVisitRepository(
	db: Database,
): GroupVisitRepository {
	return {
		async touch(userId, groupId, at) {
			await db
				.insert(groupVisit)
				.values({ userId, groupId, visitedAt: at })
				.onConflictDoUpdate({
					target: [groupVisit.userId, groupVisit.groupId],
					set: { visitedAt: at },
				});
		},
	};
}
