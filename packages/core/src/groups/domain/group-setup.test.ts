import { describe, expect, it } from "vitest";

import { groupSetupOf } from "./group-setup";

const open = { setupDismissedAt: null };

describe("Configurar seu grupo (spec 034, RN-17)", () => {
	it("a member never gets the setup", () => {
		expect(groupSetupOf(open, 3, "member")).toBeNull();
	});

	it("Convidar membros is done once the group has a second member", () => {
		expect(groupSetupOf(open, 1, "admin")).toEqual({
			invited: false,
			assigned: false,
			posted: false,
		});
		expect(groupSetupOf(open, 2, "admin")?.invited).toBe(true);
	});

	it("the setup is gone once dismissed", () => {
		expect(
			groupSetupOf({ setupDismissedAt: new Date() }, 1, "admin"),
		).toBeNull();
	});
});
