import { describe, expect, it } from "vitest";

import { GroupNotFoundError } from "../domain/group-errors";
import { groupsTestDeps } from "../testing/groups-test-deps";
import { requireMembership } from "./load-group";

describe("requireMembership (spec 034, RN-05)", () => {
	it("gives a member the group and their role", async () => {
		const { deps, aGroupOf } = groupsTestDeps();
		const groupId = await aGroupOf("ana", ["bruno"]);

		const { group, membership } = await requireMembership(deps, {
			groupId,
			userId: "bruno",
		});

		expect(group.id).toBe(groupId);
		expect(membership.role).toBe("member");
	});

	it("a non-member gets GROUP.NOT_FOUND, like an unknown id", async () => {
		const { deps, aGroupOf } = groupsTestDeps();
		const groupId = await aGroupOf("ana");

		const outsider = requireMembership(deps, { groupId, userId: "bruno" });
		const unknown = requireMembership(deps, { groupId: "nope", userId: "ana" });

		await expect(outsider).rejects.toThrow(GroupNotFoundError);
		await expect(unknown).rejects.toThrow(GroupNotFoundError);
	});
});
