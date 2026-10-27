import { describe, expect, it } from "vitest";

import { GroupNotFoundError } from "../domain/group-errors";
import { groupsTestDeps } from "../testing/groups-test-deps";
import { createGetGroup } from "./get-group";

describe("getGroup (spec 034)", () => {
	it("the admin's view has role admin and the setup", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana");

		const view = await createGetGroup(t.deps)({ userId: "ana", groupId });

		expect(view).toMatchObject({
			id: groupId,
			name: "Turma 7A",
			role: "admin",
			setup: { invited: false, assigned: false, posted: false },
		});
	});

	it("a member's view has no setup", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana", ["bruno"]);

		const view = await createGetGroup(t.deps)({ userId: "bruno", groupId });

		expect(view.role).toBe("member");
		expect(view.setup).toBeNull();
	});

	it("tells the admin's name, member count, creation date and up to 3 members, admin first", async () => {
		const t = groupsTestDeps();
		t.store.addUser({ id: "davi", name: "Davi", email: "davi@exemplo.com" });
		const groupId = await t.aGroupOf("carla", ["davi", "bruno", "ana"]);

		const view = await createGetGroup(t.deps)({ userId: "ana", groupId });

		expect(view).toMatchObject({
			adminName: "Carla",
			memberCount: 4,
			createdAt: new Date("2026-10-26T12:00:00.000Z"),
		});
		expect(view.memberPreview).toEqual([
			{ userId: "carla", name: "Carla", photoUrl: null },
			{ userId: "ana", name: "Ana", photoUrl: null },
			{ userId: "bruno", name: "Bruno", photoUrl: null },
		]);
	});

	it("a non-member gets GROUP.NOT_FOUND", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana");

		await expect(
			createGetGroup(t.deps)({ userId: "bruno", groupId }),
		).rejects.toThrow(GroupNotFoundError);
	});

	it("tells the description (spec 035, RN-06)", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana", ["bruno"]);
		await t.store.saveDetails(groupId, {
			name: "Turma 7A",
			description: "Revisão",
		});

		const view = await createGetGroup(t.deps)({ userId: "bruno", groupId });

		expect(view.description).toBe("Revisão");
	});

	it("abilities follow the switches for a member and are all true for the admin (spec 035)", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana", ["bruno"]);
		await t.store.savePermission(groupId, "membersCanInvite", false);
		const get = createGetGroup(t.deps);

		expect((await get({ userId: "bruno", groupId })).abilities).toEqual({
			invite: false,
			seeMembers: true,
			assign: false,
			share: true,
		});
		expect((await get({ userId: "ana", groupId })).abilities).toEqual({
			invite: true,
			seeMembers: true,
			assign: true,
			share: true,
		});
	});

	it("share follows membersCanShare for a member (spec 037, RN-01)", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana", ["bruno"]);
		await t.store.savePermission(groupId, "membersCanShare", false);
		const get = createGetGroup(t.deps);

		expect((await get({ userId: "bruno", groupId })).abilities.share).toBe(
			false,
		);
		expect((await get({ userId: "ana", groupId })).abilities.share).toBe(true);
	});

	it("with the list hidden a member gets no preview, but the total and the admin (spec 035, RN-13, RN-14)", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana", ["bruno", "carla"]);
		await t.store.savePermission(groupId, "membersCanSeeMembers", false);

		const view = await createGetGroup(t.deps)({ userId: "bruno", groupId });

		expect(view).toMatchObject({
			adminName: "Ana",
			memberCount: 3,
			memberPreview: [],
			abilities: { seeMembers: false },
		});
	});

	it("the admin always gets the preview (spec 035, CA-13)", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana", ["bruno"]);
		await t.store.savePermission(groupId, "membersCanSeeMembers", false);

		const view = await createGetGroup(t.deps)({ userId: "ana", groupId });

		expect(view.memberPreview).toHaveLength(2);
	});

	it("inviting without seeing members (spec 035, RN-15)", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana", ["bruno"]);
		await t.store.savePermission(groupId, "membersCanSeeMembers", false);

		const view = await createGetGroup(t.deps)({ userId: "bruno", groupId });

		expect(view.abilities).toEqual({
			invite: true,
			seeMembers: false,
			assign: false,
			share: true,
		});
	});
});
