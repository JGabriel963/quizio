import { describe, expect, it } from "vitest";

import { aGroup } from "../testing/a-group";
import {
	AdminCannotLeaveError,
	CannotRemoveAdminError,
	InviteNotAllowedError,
	MembersHiddenError,
	NotGroupAdminError,
} from "./group-errors";
import {
	assertAdmin,
	assertCanInvite,
	assertCanLeave,
	assertCanSeeMembers,
	assertRemovable,
	canInvite,
	canSeeMembers,
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
