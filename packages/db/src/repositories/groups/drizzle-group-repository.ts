import type { GroupRepository } from "@quizio/core/groups/application/ports/group-repository";
import type { Group } from "@quizio/core/groups/domain/group";
import { eq } from "drizzle-orm";

import { groupMember, groupTable } from "../../schema/groups";
import type { Database } from "../../types";

const toGroup = (row: typeof groupTable.$inferSelect): Group => ({
	id: row.id,
	name: row.name,
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
				await tx.insert(groupTable).values(group);
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

		async delete(id) {
			// Members and visits go by the foreign keys' cascade.
			await db.delete(groupTable).where(eq(groupTable.id, id));
		},
	};
}
