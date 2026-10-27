import type { GroupRepository } from "@quizio/core/groups/application/ports/group-repository";
import type { Group } from "@quizio/core/groups/domain/group";
import type { GroupPermission } from "@quizio/core/groups/domain/group-permissions";
import { eq } from "drizzle-orm";

import { groupMember, groupTable } from "../../schema/groups";
import type { Database } from "../../types";

/** Each switch's column (spec 035). */
const PERMISSION_COLUMNS = {
	membersCanInvite: "membersCanInvite",
	membersCanSeeMembers: "membersCanSeeMembers",
	membersCanShare: "membersCanShare",
	membersCanAssign: "membersCanAssign",
} as const satisfies Record<
	GroupPermission,
	keyof typeof groupTable.$inferSelect
>;

const toGroup = (row: typeof groupTable.$inferSelect): Group => ({
	id: row.id,
	name: row.name,
	description: row.description,
	permissions: {
		membersCanInvite: row.membersCanInvite,
		membersCanSeeMembers: row.membersCanSeeMembers,
		membersCanShare: row.membersCanShare,
		membersCanAssign: row.membersCanAssign,
	},
	adminId: row.adminId,
	inviteCode: row.inviteCode,
	createdAt: row.createdAt,
	setupDismissedAt: row.setupDismissedAt,
});

export function createDrizzleGroupRepository(db: Database): GroupRepository {
	return {
		async findById(id) {
			const [row] = await db
				.select()
				.from(groupTable)
				.where(eq(groupTable.id, id))
				.limit(1);
			return row ? toGroup(row) : null;
		},

		async findByInviteCode(code) {
			const [row] = await db
				.select()
				.from(groupTable)
				.where(eq(groupTable.inviteCode, code))
				.limit(1);
			return row ? toGroup(row) : null;
		},

		async create(group, admin) {
			// A group never exists without its admin's membership (RN-01).
			await db.transaction(async (tx) => {
				const { permissions, ...row } = group;
				await tx.insert(groupTable).values({ ...row, ...permissions });
				await tx.insert(groupMember).values(admin);
			});
		},

		async saveInviteCode(id, code) {
			await db
				.update(groupTable)
				.set({ inviteCode: code })
				.where(eq(groupTable.id, id));
		},

		async saveSetupDismissed(id, at) {
			await db
				.update(groupTable)
				.set({ setupDismissedAt: at })
				.where(eq(groupTable.id, id));
		},

		async saveDetails(id, { name, description }) {
			await db
				.update(groupTable)
				.set({ name, description })
				.where(eq(groupTable.id, id));
		},

		async savePermission(id, permission, value) {
			await db
				.update(groupTable)
				.set({ [PERMISSION_COLUMNS[permission]]: value })
				.where(eq(groupTable.id, id));
		},

		async delete(id) {
			// Members and visits go by the foreign keys' cascade.
			await db.delete(groupTable).where(eq(groupTable.id, id));
		},
	};
}
