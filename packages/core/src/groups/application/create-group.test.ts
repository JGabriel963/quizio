import { describe, expect, it } from "vitest";

import { InvalidGroupNameError } from "../domain/group-errors";
import { groupsTestDeps } from "../testing/groups-test-deps";
import { createCreateGroup } from "./create-group";

describe("createGroup (spec 034)", () => {
	it("creates the group with its creator as admin and only member", async () => {
		const { deps, store } = groupsTestDeps();

		const { groupId } = await createCreateGroup(deps)({
			userId: "ana",
			name: " Turma 7A ",
		});

		expect(await store.findById(groupId)).toMatchObject({
			name: "Turma 7A",
			adminId: "ana",
			createdAt: new Date("2026-10-26T12:00:00.000Z"),
			setupDismissedAt: null,
		});
		expect(await store.members(groupId)).toEqual([
			expect.objectContaining({ userId: "ana", role: "admin" }),
		]);
	});

	it("gives the group an invite code", async () => {
		const { deps, store } = groupsTestDeps();

		const { groupId } = await createCreateGroup(deps)({
			userId: "ana",
			name: "Coral",
		});

		expect((await store.findById(groupId))?.inviteCode).toBe("invite-1");
	});

	it("refuses an invalid name before writing", async () => {
		const { deps, store } = groupsTestDeps();

		await expect(
			createCreateGroup(deps)({ userId: "ana", name: "a".repeat(21) }),
		).rejects.toThrow(InvalidGroupNameError);
		expect(await store.listForUser("ana")).toEqual([]);
	});

	it("a new group has no description and Kahoot's defaults (spec 035, RN-08)", async () => {
		const { deps, store } = groupsTestDeps();

		const { groupId } = await createCreateGroup(deps)({
			userId: "ana",
			name: "Coral",
		});

		expect(await store.findById(groupId)).toMatchObject({
			description: "",
			permissions: {
				membersCanInvite: true,
				membersCanSeeMembers: true,
				membersCanShare: true,
				membersCanAssign: false,
			},
		});
	});
});
