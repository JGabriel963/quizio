import type { GroupMemberRepository } from "@quizio/core/groups/application/ports/group-member-repository";
import { and, eq, sql } from "drizzle-orm";

import { groupMember, groupTable } from "../../schema/groups";
import type { Database } from "../../types";

export function createDrizzleGroupMemberRepository(
	db: Database,
): GroupMemberRepository {
	return {
		async find(groupId, userId) {
			const [row] = await db
				.select()
				.from(groupMember)
				.where(
					and(eq(groupMember.groupId, groupId), eq(groupMember.userId, userId)),
				)
				.limit(1);
			return row ?? null;
		},

		async addWithInvite({ groupId, inviteCode, userId, joinedAt }) {
			// One statement: the row comes from the group only while its code is
			// still this one (RN-29), and the key keeps one membership (CA-20).
			const added = await db
				.insert(groupMember)
				.select(
					db
						.select({
							groupId: groupTable.id,
							userId: sql`${userId}`.as("user_id"),
							role: sql`'member'::group_role`.as("role"),
							joinedAt: sql`${joinedAt}::timestamptz`.as("joined_at"),
						})
						.from(groupTable)
						.where(
							and(
								eq(groupTable.id, groupId),
								eq(groupTable.inviteCode, inviteCode),
							),
						),
				)
				.onConflictDoNothing()
				.returning({ userId: groupMember.userId });
			if (added.length > 0) {
				return "added";
			}
			return (await this.find(groupId, userId)) ? "alreadyMember" : "invalid";
		},

		async remove(groupId, userId) {
			await db
				.delete(groupMember)
				.where(
					and(eq(groupMember.groupId, groupId), eq(groupMember.userId, userId)),
				);
		},
	};
}
