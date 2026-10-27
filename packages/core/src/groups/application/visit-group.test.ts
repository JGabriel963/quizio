import { describe, expect, it } from "vitest";

import { GroupNotFoundError } from "../domain/group-errors";
import { groupsTestDeps } from "../testing/groups-test-deps";
import { createListRecentGroups } from "./list-recent-groups";
import { createVisitGroup } from "./visit-group";

describe("visitGroup (spec 034, RN-20)", () => {
	it("a revisit moves the group to the top", async () => {
		const t = groupsTestDeps();
		const visit = createVisitGroup(t.deps);
		const first = await t.aGroupOf("ana", [], "Primeiro");
		const second = await t.aGroupOf("ana", [], "Segundo");
		await visit({ userId: "ana", groupId: first });
		t.clock.advanceBy(1000);
		await visit({ userId: "ana", groupId: second });
		t.clock.advanceBy(1000);

		await visit({ userId: "ana", groupId: first });
		const { items } = await createListRecentGroups(t.deps)({ userId: "ana" });

		expect(items.map((item) => item.name)).toEqual(["Primeiro", "Segundo"]);
	});

	it("a non-member cannot visit", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana");

		await expect(
			createVisitGroup(t.deps)({ userId: "bruno", groupId }),
		).rejects.toThrow(GroupNotFoundError);
	});
});
