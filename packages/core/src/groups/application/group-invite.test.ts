import { describe, expect, it } from "vitest";

import {
	GroupNotFoundError,
	InvalidGroupInviteError,
	InviteNotAllowedError,
	NotGroupAdminError,
} from "../domain/group-errors";
import { groupsTestDeps } from "../testing/groups-test-deps";
import { createAcceptGroupInvite } from "./accept-group-invite";
import { createDeleteGroup } from "./delete-group";
import { createGetGroupInvitation } from "./get-group-invitation";
import { createGetGroupInvite } from "./get-group-invite";
import { createListGroupMembers } from "./list-group-members";
import { createRemoveGroupMember } from "./remove-group-member";
import { createResetGroupInvite } from "./reset-group-invite";

describe("the group's invite (spec 034)", () => {
	it("the admin reads the code", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana");

		expect(
			await createGetGroupInvite(t.deps)({ userId: "ana", groupId }),
		).toEqual({ code: "invite-1" });
	});

	it("a member reads the code when the admin allows, but cannot reset (spec 035, RN-11)", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana", ["bruno"]);
		const read = createGetGroupInvite(t.deps);
		const reset = createResetGroupInvite(t.deps);

		expect(await read({ userId: "bruno", groupId })).toEqual({
			code: "invite-1",
		});
		await expect(reset({ userId: "bruno", groupId })).rejects.toThrow(
			NotGroupAdminError,
		);
		await expect(read({ userId: "carla", groupId })).rejects.toThrow(
			GroupNotFoundError,
		);
		expect((await t.store.findById(groupId))?.inviteCode).toBe("invite-1");
	});

	it("with inviting off a member gets GROUP.INVITE_NOT_ALLOWED and the link still lets people in (spec 035, RN-12)", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana", ["bruno"]);
		await t.store.savePermission(groupId, "membersCanInvite", false);

		await expect(
			createGetGroupInvite(t.deps)({ userId: "bruno", groupId }),
		).rejects.toThrow(InviteNotAllowedError);
		expect(
			await createGetGroupInvite(t.deps)({ userId: "ana", groupId }),
		).toEqual({ code: "invite-1" });
		await createAcceptGroupInvite(t.deps)({
			userId: "carla",
			code: "invite-1",
		});
		expect(await t.store.find(groupId, "carla")).not.toBeNull();
	});

	it("reset gives a new code; the old one is invalid and the members stay", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana", ["bruno"]);

		const { code } = await createResetGroupInvite(t.deps)({
			userId: "ana",
			groupId,
		});

		expect(code).toBe("invite-2");
		const find = createGetGroupInvitation(t.deps);
		expect(await find({ userId: "carla", code: "invite-1" })).toEqual({
			status: "invalid",
		});
		expect(await find({ userId: "carla", code })).toEqual({
			status: "pending",
			groupId,
			name: "Turma 7A",
		});
		expect(await t.store.find(groupId, "bruno")).not.toBeNull();
	});
});

describe("the invitation screen (spec 034, RN-25 to RN-28)", () => {
	it("a pending invitation tells only the group's name", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana");

		expect(
			await createGetGroupInvitation(t.deps)({
				userId: "bruno",
				code: "invite-1",
			}),
		).toEqual({ status: "pending", groupId, name: "Turma 7A" });
	});

	it("a member or the admin gets status member", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana", ["bruno"]);
		const find = createGetGroupInvitation(t.deps);

		for (const userId of ["ana", "bruno"]) {
			expect(await find({ userId, code: "invite-1" })).toEqual({
				status: "member",
				groupId,
			});
		}
	});

	it("reset, deleted and unknown codes are the same invalid status", async () => {
		const t = groupsTestDeps();
		const resetOne = await t.aGroupOf("ana", [], "Redefinido");
		await createResetGroupInvite(t.deps)({ userId: "ana", groupId: resetOne });
		const deleted = await t.aGroupOf("ana", [], "Excluído");
		const deletedCode = (await t.store.findById(deleted))?.inviteCode ?? "";
		await createDeleteGroup(t.deps)({ userId: "ana", groupId: deleted });
		const find = createGetGroupInvitation(t.deps);

		for (const code of ["invite-1", deletedCode, "made-up"]) {
			expect(await find({ userId: "bruno", code })).toEqual({
				status: "invalid",
			});
		}
	});
});

describe("acceptGroupInvite (spec 034)", () => {
	it("accepting makes a member who sees the group", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana");

		expect(
			await createAcceptGroupInvite(t.deps)({
				userId: "bruno",
				code: "invite-1",
			}),
		).toEqual({ groupId });
		expect(await t.store.find(groupId, "bruno")).toMatchObject({
			role: "member",
			joinedAt: new Date("2026-10-26T12:00:00.000Z"),
		});
	});

	it("accepting twice adds one membership", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana");
		const accept = createAcceptGroupInvite(t.deps);

		await Promise.all([
			accept({ userId: "bruno", code: "invite-1" }),
			accept({ userId: "bruno", code: "invite-1" }),
		]);

		const { total } = await createListGroupMembers(t.deps)({
			userId: "ana",
			groupId,
		});
		expect(total).toBe(2);
	});

	it("an old code fails with GROUP.INVITE_INVALID", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana");
		await createResetGroupInvite(t.deps)({ userId: "ana", groupId });

		await expect(
			createAcceptGroupInvite(t.deps)({ userId: "bruno", code: "invite-1" }),
		).rejects.toThrow(InvalidGroupInviteError);
	});

	it("a removed member can come back with the link", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana", ["bruno"]);
		await createRemoveGroupMember(t.deps)({
			userId: "ana",
			groupId,
			memberId: "bruno",
		});

		await createAcceptGroupInvite(t.deps)({
			userId: "bruno",
			code: "invite-1",
		});

		expect(await t.store.find(groupId, "bruno")).not.toBeNull();
	});
});
