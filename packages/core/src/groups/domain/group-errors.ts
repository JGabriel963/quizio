import { DomainError } from "../../shared/domain/domain-error";
import { NotFoundError } from "../../shared/domain/not-found-error";

export class InvalidGroupNameError extends DomainError {
	readonly code = "GROUP.INVALID_NAME";
	constructor() {
		super("A group's name has 1 to 20 characters.");
	}
}

/** Unknown, or the caller is not a member: the same answer (spec 034, RN-05). */
export class GroupNotFoundError extends NotFoundError {
	readonly code = "GROUP.NOT_FOUND";
	constructor() {
		super("Group not found.");
	}
}

export class GroupMemberNotFoundError extends NotFoundError {
	readonly code = "GROUP.MEMBER_NOT_FOUND";
	constructor() {
		super("Group member not found.");
	}
}

export class NotGroupAdminError extends DomainError {
	readonly code = "GROUP.NOT_ADMIN";
	constructor() {
		super("Only the group's admin may do this.");
	}
}

export class AdminCannotLeaveError extends DomainError {
	readonly code = "GROUP.ADMIN_CANNOT_LEAVE";
	constructor() {
		super("The group's admin cannot leave it.");
	}
}

export class CannotRemoveAdminError extends DomainError {
	readonly code = "GROUP.CANNOT_REMOVE_ADMIN";
	constructor() {
		super("The group's admin cannot be removed.");
	}
}

/** Reset, of a deleted group, or never issued (spec 034, RN-28). */
export class InvalidGroupInviteError extends DomainError {
	readonly code = "GROUP.INVITE_INVALID";
	constructor() {
		super("This invite is no longer valid.");
	}
}
