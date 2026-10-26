import {
	AdminCannotLeaveError,
	AssignNotAllowedError,
	CannotRemoveAdminError,
	InviteNotAllowedError,
	MembersHiddenError,
	NotGroupAdminError,
} from "./group-errors";
import type { GroupRole } from "./group-member";

/** The four switches of "Configurações do grupo" (spec 035, RN-07). */
export const GROUP_PERMISSIONS = [
	"membersCanInvite",
	"membersCanSeeMembers",
	"membersCanShare",
	"membersCanAssign",
] as const;
export type GroupPermission = (typeof GROUP_PERMISSIONS)[number];
export type GroupPermissions = Record<GroupPermission, boolean>;

/** Kahoot's defaults (RN-08); the database's column defaults repeat them. */
export const DEFAULT_GROUP_PERMISSIONS: GroupPermissions = {
	membersCanInvite: true,
	membersCanSeeMembers: true,
	membersCanShare: true,
	membersCanAssign: false,
};

type WithPermissions = { permissions: GroupPermissions };

/**
 * What each role may do (spec 034). Named checks, so the switches of spec 035
 * change them in one place.
 */
export function assertAdmin(membership: { role: GroupRole }): void {
	if (membership.role !== "admin") {
		throw new NotGroupAdminError();
	}
}

/** The admin deletes the group instead (RN-36). */
export function assertCanLeave(membership: { role: GroupRole }): void {
	if (membership.role === "admin") {
		throw new AdminCannotLeaveError();
	}
}

/** Nobody removes the admin (RN-33). */
export function assertRemovable(target: { role: GroupRole }): void {
	if (target.role === "admin") {
		throw new CannotRemoveAdminError();
	}
}

/** The admin always; a member when the admin lets them (spec 035, RN-11, RN-12). */
export function canInvite(group: WithPermissions, role: GroupRole): boolean {
	return role === "admin" || group.permissions.membersCanInvite;
}

/** The admin always; a member when the list is not hidden (spec 035, RN-13). */
export function canSeeMembers(
	group: WithPermissions,
	role: GroupRole,
): boolean {
	return role === "admin" || group.permissions.membersCanSeeMembers;
}

export function assertCanInvite(
	group: WithPermissions,
	membership: { role: GroupRole },
): void {
	if (!canInvite(group, membership.role)) {
		throw new InviteNotAllowedError();
	}
}

export function assertCanSeeMembers(
	group: WithPermissions,
	membership: { role: GroupRole },
): void {
	if (!canSeeMembers(group, membership.role)) {
		throw new MembersHiddenError();
	}
}

/** The admin always; a member when the admin lets them (spec 038, RN-01). */
export function canAssign(group: WithPermissions, role: GroupRole): boolean {
	return role === "admin" || group.permissions.membersCanAssign;
}

export function assertCanAssign(
	group: WithPermissions,
	membership: { role: GroupRole },
): void {
	if (!canAssign(group, membership.role)) {
		throw new AssignNotAllowedError();
	}
}

/**
 * "Ver relatório" and "Excluir publicação": who posted while still a member,
 * and the admin (spec 038, RN-20, RN-31). Null is somebody out of the group.
 */
export function canManagePost(
	post: { authorId: string },
	viewer: { userId: string; role: GroupRole } | null,
): boolean {
	if (!viewer) {
		return false;
	}
	return viewer.role === "admin" || viewer.userId === post.authorId;
}
