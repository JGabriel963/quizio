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
			{ userId: "carla", name: "Carla" },
			{ userId: "ana", name: "Ana" },
			{ userId: "bruno", name: "Bruno" },
		]);
	});

	it("a non-member gets GROUP.NOT_FOUND", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana");

		await expect(
			createGetGroup(t.deps)({ userId: "bruno", groupId }),
		).rejects.toThrow(GroupNotFoundError);
	});
});
