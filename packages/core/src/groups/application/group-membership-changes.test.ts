import { describe, expect, it } from "vitest";

import {
	AdminCannotLeaveError,
	CannotRemoveAdminError,
	GroupMemberNotFoundError,
	GroupNotFoundError,
	NotGroupAdminError,
} from "../domain/group-errors";
import { groupsTestDeps } from "../testing/groups-test-deps";
import { createDeleteGroup } from "./delete-group";
import { createGetGroup } from "./get-group";
import { createGetGroupInvitation } from "./get-group-invitation";
import { createLeaveGroup } from "./leave-group";
import { createListGroups } from "./list-groups";
import { createRemoveGroupMember } from "./remove-group-member";

describe("removeGroupMember (spec 034, RN-33, RN-35)", () => {
	it("removes a member, who then gets GROUP.NOT_FOUND", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana", ["bruno"]);

		await createRemoveGroupMember(t.deps)({
			userId: "ana",
			groupId,
			memberId: "bruno",
		});

		await expect(
			createGetGroup(t.deps)({ userId: "bruno", groupId }),
		).rejects.toThrow(GroupNotFoundError);
		const { items } = await createListGroups(t.deps)({
			userId: "bruno",
			section: "joined",
		});
		expect(items).toEqual([]);
	});

	it("refuses removing the admin", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana");

		await expect(
			createRemoveGroupMember(t.deps)({
				userId: "ana",
				groupId,
				memberId: "ana",
			}),
		).rejects.toThrow(CannotRemoveAdminError);
	});

	it("a member cannot remove", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana", ["bruno", "carla"]);

		await expect(
			createRemoveGroupMember(t.deps)({
				userId: "bruno",
				groupId,
				memberId: "carla",
			}),
		).rejects.toThrow(NotGroupAdminError);
	});

	it("an unknown member is GROUP.MEMBER_NOT_FOUND", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana");

		await expect(
			createRemoveGroupMember(t.deps)({
				userId: "ana",
				groupId,
				memberId: "bruno",
			}),
		).rejects.toThrow(GroupMemberNotFoundError);
	});
});

describe("leaveGroup (spec 034, RN-36)", () => {
	it("a member leaves", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana", ["bruno"]);

		await createLeaveGroup(t.deps)({ userId: "bruno", groupId });

		expect(await t.store.find(groupId, "bruno")).toBeNull();
	});

	it("the admin cannot leave", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana");

		await expect(
			createLeaveGroup(t.deps)({ userId: "ana", groupId }),
		).rejects.toThrow(AdminCannotLeaveError);
	});
});

describe("deleteGroup (spec 034, RN-37)", () => {
	it("the admin deletes; members lose it and the link is invalid", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana", ["bruno"]);

		await createDeleteGroup(t.deps)({ userId: "ana", groupId });

		await expect(
			createGetGroup(t.deps)({ userId: "bruno", groupId }),
		).rejects.toThrow(GroupNotFoundError);
		expect(
			await createGetGroupInvitation(t.deps)({
				userId: "carla",
				code: "invite-1",
			}),
		).toEqual({ status: "invalid" });
	});

	it("a member cannot delete", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana", ["bruno"]);

		await expect(
			createDeleteGroup(t.deps)({ userId: "bruno", groupId }),
		).rejects.toThrow(NotGroupAdminError);
		expect(await t.store.findById(groupId)).not.toBeNull();
	});
});
