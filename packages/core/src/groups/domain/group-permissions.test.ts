import { describe, expect, it } from "vitest";

import { aGroup } from "../testing/a-group";
import {
	AdminCannotLeaveError,
	AssignNotAllowedError,
	CannotRemoveAdminError,
	InviteNotAllowedError,
	MembersHiddenError,
	NotGroupAdminError,
	ShareNotAllowedError,
} from "./group-errors";
import {
	assertAdmin,
	assertCanAssign,
	assertCanInvite,
	assertCanLeave,
	assertCanSeeMembers,
	assertCanShare,
	assertRemovable,
	canAssign,
	canInvite,
	canManagePost,
	canSeeMembers,
	canShare,
	canUnshare,
	DEFAULT_GROUP_PERMISSIONS,
} from "./group-permissions";

const admin = { role: "admin" as const };
const member = { role: "member" as const };

describe("group permissions (spec 034)", () => {
	it("assertAdmin refuses a member with GROUP.NOT_ADMIN", () => {
		expect(() => assertAdmin(admin)).not.toThrow();
		expect(() => assertAdmin(member)).toThrow(NotGroupAdminError);
		expect(new NotGroupAdminError().code).toBe("GROUP.NOT_ADMIN");
	});

	it("assertCanLeave refuses the admin with GROUP.ADMIN_CANNOT_LEAVE", () => {
		expect(() => assertCanLeave(member)).not.toThrow();
		expect(() => assertCanLeave(admin)).toThrow(AdminCannotLeaveError);
		expect(new AdminCannotLeaveError().code).toBe("GROUP.ADMIN_CANNOT_LEAVE");
	});

	it("assertRemovable refuses the admin with GROUP.CANNOT_REMOVE_ADMIN", () => {
		expect(() => assertRemovable(member)).not.toThrow();
		expect(() => assertRemovable(admin)).toThrow(CannotRemoveAdminError);
		expect(new CannotRemoveAdminError().code).toBe("GROUP.CANNOT_REMOVE_ADMIN");
	});
});

describe("members' permissions (spec 035, RN-07, RN-08)", () => {
	const closed = aGroup({
		permissions: {
			...DEFAULT_GROUP_PERMISSIONS,
			membersCanInvite: false,
			membersCanSeeMembers: false,
		},
	});

	it("a new group has Kahoot's defaults: invite, see and share on, assign off", () => {
		expect(DEFAULT_GROUP_PERMISSIONS).toEqual({
			membersCanInvite: true,
			membersCanSeeMembers: true,
			membersCanShare: true,
			membersCanAssign: false,
		});
	});

	it("the admin may always invite and see members", () => {
		expect(canInvite(closed, "admin")).toBe(true);
		expect(canSeeMembers(closed, "admin")).toBe(true);
	});

	it("a member invites and sees members only as the switches say", () => {
		expect(canInvite(aGroup(), "member")).toBe(true);
		expect(canSeeMembers(aGroup(), "member")).toBe(true);
		expect(canInvite(closed, "member")).toBe(false);
		expect(canSeeMembers(closed, "member")).toBe(false);
	});

	it("assertCanInvite refuses with GROUP.INVITE_NOT_ALLOWED", () => {
		expect(() => assertCanInvite(closed, member)).toThrow(
			InviteNotAllowedError,
		);
		expect(() => assertCanInvite(closed, admin)).not.toThrow();
		expect(new InviteNotAllowedError().code).toBe("GROUP.INVITE_NOT_ALLOWED");
	});

	it("assertCanSeeMembers refuses with GROUP.MEMBERS_HIDDEN", () => {
		expect(() => assertCanSeeMembers(closed, member)).toThrow(
			MembersHiddenError,
		);
		expect(() => assertCanSeeMembers(closed, admin)).not.toThrow();
		expect(new MembersHiddenError().code).toBe("GROUP.MEMBERS_HIDDEN");
	});
});

describe("assigning and managing posts (spec 038)", () => {
	const withAssign = (membersCanAssign: boolean) =>
		aGroup({
			permissions: { ...DEFAULT_GROUP_PERMISSIONS, membersCanAssign },
		});

	it("canAssign: the admin always, a member with the switch (RN-01)", () => {
		expect(canAssign(withAssign(false), "admin")).toBe(true);
		expect(canAssign(withAssign(false), "member")).toBe(false);
		expect(canAssign(withAssign(true), "member")).toBe(true);
	});

	it("assertCanAssign refuses with GROUP.ASSIGN_NOT_ALLOWED", () => {
		expect(() => assertCanAssign(withAssign(false), member)).toThrow(
			AssignNotAllowedError,
		);
		expect(() => assertCanAssign(withAssign(true), member)).not.toThrow();
		expect(new AssignNotAllowedError().code).toBe("GROUP.ASSIGN_NOT_ALLOWED");
	});

	it("canManagePost: the author while a member, or the admin (RN-20, RN-31)", () => {
		const post = { authorId: "bruno" };

		expect(canManagePost(post, { userId: "bruno", role: "member" })).toBe(true);
		expect(canManagePost(post, { userId: "ana", role: "admin" })).toBe(true);
		expect(canManagePost(post, { userId: "carla", role: "member" })).toBe(
			false,
		);
		expect(canManagePost(post, null)).toBe(false);
	});
});

describe("sharing quizzes (spec 037)", () => {
	const withShare = (membersCanShare: boolean) =>
		aGroup({
			permissions: { ...DEFAULT_GROUP_PERMISSIONS, membersCanShare },
		});

	it("canShare: the admin always, a member only with membersCanShare (RN-01)", () => {
		expect(canShare(withShare(false), "admin")).toBe(true);
		expect(canShare(withShare(false), "member")).toBe(false);
		expect(canShare(withShare(true), "member")).toBe(true);
	});

	it("assertCanShare refuses with GROUP.SHARE_NOT_ALLOWED", () => {
		expect(() => assertCanShare(withShare(false), member)).toThrow(
			ShareNotAllowedError,
		);
		expect(() => assertCanShare(withShare(true), member)).not.toThrow();
		expect(new ShareNotAllowedError().code).toBe("GROUP.SHARE_NOT_ALLOWED");
	});

	it("canUnshare: who shared and the admin (RN-11, RN-13)", () => {
		const shared = { sharedById: "bruno" };

		expect(canUnshare(shared, { userId: "bruno", role: "member" })).toBe(true);
		expect(canUnshare(shared, { userId: "ana", role: "admin" })).toBe(true);
		expect(canUnshare(shared, { userId: "carla", role: "member" })).toBe(false);
	});
});
