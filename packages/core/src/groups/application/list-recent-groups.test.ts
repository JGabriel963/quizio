import { describe, expect, it } from "vitest";

import { groupsTestDeps } from "../testing/groups-test-deps";
import { createDeleteGroup } from "./delete-group";
import { createLeaveGroup } from "./leave-group";
import { createListRecentGroups } from "./list-recent-groups";
import { createRemoveGroupMember } from "./remove-group-member";
import { createVisitGroup } from "./visit-group";

describe("listRecentGroups (spec 034, RN-10)", () => {
	it("keeps the 5 most recent", async () => {
		const t = groupsTestDeps();
		const visit = createVisitGroup(t.deps);
		for (const name of ["G1", "G2", "G3", "G4", "G5", "G6"]) {
			const groupId = await t.aGroupOf("ana", [], name);
			t.clock.advanceBy(1000);
			await visit({ userId: "ana", groupId });
		}

		const { items } = await createListRecentGroups(t.deps)({ userId: "ana" });

		expect(items.map((item) => item.name)).toEqual([
			"G6",
			"G5",
			"G4",
			"G3",
			"G2",
		]);
	});

	it("drops deleted, left and removed groups", async () => {
		const t = groupsTestDeps();
		const visit = createVisitGroup(t.deps);
		const deleted = await t.aGroupOf("carla", ["bruno"], "Excluído");
		const left = await t.aGroupOf("carla", ["bruno"], "Saiu");
		const removed = await t.aGroupOf("carla", ["bruno"], "Removido");
		const kept = await t.aGroupOf("carla", ["bruno"], "Ficou");
		for (const groupId of [deleted, left, removed, kept]) {
			await visit({ userId: "bruno", groupId });
		}

		await createDeleteGroup(t.deps)({ userId: "carla", groupId: deleted });
		await createLeaveGroup(t.deps)({ userId: "bruno", groupId: left });
		await createRemoveGroupMember(t.deps)({
			userId: "carla",
			groupId: removed,
			memberId: "bruno",
		});
		const { items } = await createListRecentGroups(t.deps)({ userId: "bruno" });

		expect(items).toEqual([{ id: kept, name: "Ficou" }]);
	});
});
