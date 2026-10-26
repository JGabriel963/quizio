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

export class InvalidGroupDescriptionError extends DomainError {
	readonly code = "GROUP.INVALID_DESCRIPTION";
	constructor() {
		super("A group's description has up to 500 characters.");
	}
}

/** The admin did not let members invite (spec 035, RN-12). */
export class InviteNotAllowedError extends DomainError {
	readonly code = "GROUP.INVITE_NOT_ALLOWED";
	constructor() {
		super("The group's admin does not let members invite.");
	}
}

/** The admin hid the member list from members (spec 035, RN-13). */
export class MembersHiddenError extends DomainError {
	readonly code = "GROUP.MEMBERS_HIDDEN";
	constructor() {
		super("The group's admin hid the member list.");
	}
}

export class InvalidPostMessageError extends DomainError {
	readonly code = "GROUP.INVALID_MESSAGE";
	constructor() {
		super("A post's message has up to 500 characters.");
	}
}

/** Neither the admin nor a member the admin lets assign (spec 038, RN-01). */
export class AssignNotAllowedError extends DomainError {
	readonly code = "GROUP.ASSIGN_NOT_ALLOWED";
	constructor() {
		super("Only the admin, or members when allowed, may assign in this group.");
	}
}

export class GroupPostNotFoundError extends NotFoundError {
	readonly code = "GROUP.POST_NOT_FOUND";
	constructor() {
		super("Post not found.");
	}
}

/** Only who posted and the admin delete a post (spec 038, RN-20). */
export class PostDeleteNotAllowedError extends DomainError {
	readonly code = "GROUP.POST_DELETE_NOT_ALLOWED";
	constructor() {
		super("Only who posted and the admin may delete this post.");
	}
}

/** Somebody else's, over, or gone (spec 038, RN-25). */
export class AssignmentNotShareableError extends DomainError {
	readonly code = "GROUP.ASSIGNMENT_NOT_SHAREABLE";
	constructor() {
		super("Only an open assignment of yours can go to groups.");
	}
}

/** At most once in each group (spec 038, RN-28). */
export class AlreadyAssignedToGroupError extends DomainError {
	readonly code = "GROUP.ALREADY_ASSIGNED";
	constructor() {
		super("This assignment is already in that group.");
	}
}

/** Neither text nor an attachment (spec 036, RN-06). */
export class EmptyPostError extends DomainError {
	readonly code = "GROUP.EMPTY_POST";
	constructor() {
		super("A post needs text or an attachment.");
	}
}

/** Not an image of the list, or not a PDF (spec 036, RN-09, RN-11). */
export class UnsupportedGroupFileError extends DomainError {
	readonly code = "GROUP.UNSUPPORTED_FILE";
	constructor() {
		super("Use a JPG, PNG, GIF or WebP image, or a PDF.");
	}
}

/** Empty, or over 10 MB (image) or 20 MB (PDF). */
export class InvalidGroupFileSizeError extends DomainError {
	readonly code = "GROUP.INVALID_FILE_SIZE";
	constructor() {
		super("An image has up to 10 MB and a PDF up to 20 MB.");
	}
}

/** Not this member's in this group, already used, gone, or never uploaded. */
export class GroupUploadNotFoundError extends DomainError {
	readonly code = "GROUP.UPLOAD_NOT_FOUND";
	constructor() {
		super("The file was not found; send it again.");
	}
}
