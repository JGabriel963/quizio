import { describe, expect, it } from "vitest";

import { NotGroupAdminError } from "../domain/group-errors";
import { groupsTestDeps } from "../testing/groups-test-deps";
import { createDismissGroupSetup } from "./dismiss-group-setup";
import { createGetGroup } from "./get-group";

describe("dismissGroupSetup (spec 034, RN-17)", () => {
	it("the admin dismisses the setup for good", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana");

		await createDismissGroupSetup(t.deps)({ userId: "ana", groupId });

		const view = await createGetGroup(t.deps)({ userId: "ana", groupId });
		expect(view.setup).toBeNull();
	});

	it("a member cannot dismiss", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana", ["bruno"]);

		await expect(
			createDismissGroupSetup(t.deps)({ userId: "bruno", groupId }),
		).rejects.toThrow(NotGroupAdminError);
	});
});
