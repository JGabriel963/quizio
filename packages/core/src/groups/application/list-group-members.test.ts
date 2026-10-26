import { describe, expect, it } from "vitest";

import { GroupNotFoundError } from "../domain/group-errors";
import { groupsTestDeps } from "../testing/groups-test-deps";
import { createListGroupMembers } from "./list-group-members";

describe("listGroupMembers (spec 034)", () => {
	it("lists every member, admin first", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana", ["carla", "bruno"]);

		const result = await createListGroupMembers(t.deps)({
			userId: "carla",
			groupId,
		});

		expect(result.total).toBe(3);
		expect(result.items.map((item) => [item.name, item.role])).toEqual([
			["Ana", "admin"],
			["Bruno", "member"],
			["Carla", "member"],
		]);
	});

	it("search filters and keeps the total", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana", ["carla", "bruno"]);

		const result = await createListGroupMembers(t.deps)({
			userId: "ana",
			groupId,
			search: "BRU",
		});

		expect(result.total).toBe(3);
		expect(result.items.map((item) => item.name)).toEqual(["Bruno"]);
	});

	it("the email goes only to the admin", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana", ["carla", "bruno"]);
		const list = createListGroupMembers(t.deps);

		const forAdmin = await list({ userId: "ana", groupId });
		const forMember = await list({ userId: "carla", groupId });

		expect(forAdmin.items.map((item) => item.email)).toEqual([
			"ana@exemplo.com",
			"bruno@exemplo.com",
			"carla@exemplo.com",
		]);
		expect(forMember.items.every((item) => item.email === null)).toBe(true);
	});

	it("a non-member gets GROUP.NOT_FOUND", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana");

		await expect(
			createListGroupMembers(t.deps)({ userId: "bruno", groupId }),
		).rejects.toThrow(GroupNotFoundError);
	});
});
