import type { GroupReads } from "@quizio/core/groups/application/ports/group-reads";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { user } from "../../schema/auth";
import { groupMember, groupTable, groupVisit } from "../../schema/groups";
import type { Database } from "../../types";

/**
 * The groups with what the accounts tell: names and emails come from the
 * Better Auth users (spec 034; ADR 0015).
 */
export function createDrizzleGroupReads(db: Database): GroupReads {
	return {
		async listForUser(userId) {
			const rows = await db
				.select({
					id: groupTable.id,
					name: groupTable.name,
					role: groupMember.role,
					createdAt: groupTable.createdAt,
					joinedAt: groupMember.joinedAt,
				})
				.from(groupMember)
				.innerJoin(groupTable, eq(groupTable.id, groupMember.groupId))
				.where(eq(groupMember.userId, userId));
			if (rows.length === 0) {
				return [];
			}
			const everyone = alias(groupMember, "everyone");
			const counts = await db
				.select({ groupId: everyone.groupId, total: count() })
				.from(everyone)
				.where(
					inArray(
						everyone.groupId,
						rows.map((row) => row.id),
					),
				)
				.groupBy(everyone.groupId);
			const totals = new Map(counts.map((row) => [row.groupId, row.total]));
			return rows.map((row) => ({
				id: row.id,
				name: row.name,
				role: row.role,
				memberCount: totals.get(row.id) ?? 0,
				since: row.role === "admin" ? row.createdAt : row.joinedAt,
			}));
		},

		async recentForUser(userId, limit) {
			// Only groups the user still belongs to (RN-10).
			return db
				.select({ id: groupTable.id, name: groupTable.name })
				.from(groupVisit)
				.innerJoin(groupTable, eq(groupTable.id, groupVisit.groupId))
				.innerJoin(
					groupMember,
					and(
						eq(groupMember.groupId, groupVisit.groupId),
						eq(groupMember.userId, groupVisit.userId),
					),
				)
				.where(eq(groupVisit.userId, userId))
				.orderBy(desc(groupVisit.visitedAt))
				.limit(limit);
		},

		async members(groupId) {
			return db
				.select({
					userId: groupMember.userId,
					name: user.name,
					email: user.email,
					role: groupMember.role,
					joinedAt: groupMember.joinedAt,
				})
				.from(groupMember)
				.innerJoin(user, eq(user.id, groupMember.userId))
				.where(eq(groupMember.groupId, groupId));
		},
	};
}
