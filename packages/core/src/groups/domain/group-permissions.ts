import {
	AdminCannotLeaveError,
	CannotRemoveAdminError,
	NotGroupAdminError,
} from "./group-errors";
import type { GroupRole } from "./group-member";

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
