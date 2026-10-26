import type { Group } from "../domain/group";
import type { GroupMember } from "../domain/group-member";
import { DEFAULT_GROUP_PERMISSIONS } from "../domain/group-permissions";

/** A group for tests: "Turma 7A" of user "ana", created on 2026-10-26. */
export function aGroup(overrides: Partial<Group> = {}): Group {
	return {
		id: "group-1",
		name: "Turma 7A",
		description: "",
		permissions: { ...DEFAULT_GROUP_PERMISSIONS },
		adminId: "ana",
		inviteCode: "invite-1",
		createdAt: new Date("2026-10-26T12:00:00.000Z"),
		setupDismissedAt: null,
		...overrides,
	};
}

/** The admin's membership, created with the group. */
export function adminOf(group: Group): GroupMember {
	return {
		groupId: group.id,
		userId: group.adminId,
		role: "admin",
		joinedAt: group.createdAt,
	};
}
