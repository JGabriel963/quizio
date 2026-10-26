import { describe, expect, it } from "vitest";

import {
	AdminCannotLeaveError,
	CannotRemoveAdminError,
	NotGroupAdminError,
} from "./group-errors";
import {
	assertAdmin,
	assertCanLeave,
	assertRemovable,
} from "./group-permissions";

const admin = { role: "admin" as const };
const member = { role: "member" as const };

describe("group permissions (spec 034)", () => {
	it("assertAdmin refuses a member with GROUP.NOT_ADMIN", () => {
		expect(() => assertAdmin(admin)).not.toThrow();
		expect(() => assertAdmin(member)).toThrow(NotGroupAdminError);
		expect(new NotGroupAdminError().code).toBe("GROUP.NOT_ADMIN");
	});

	it("assertCanLeave refuses the admin with GROUP.ADMIN_CANNOT_LEAVE", () => {
		expect(() => assertCanLeave(member)).not.toThrow();
		expect(() => assertCanLeave(admin)).toThrow(AdminCannotLeaveError);
		expect(new AdminCannotLeaveError().code).toBe("GROUP.ADMIN_CANNOT_LEAVE");
	});

	it("assertRemovable refuses the admin with GROUP.CANNOT_REMOVE_ADMIN", () => {
		expect(() => assertRemovable(member)).not.toThrow();
		expect(() => assertRemovable(admin)).toThrow(CannotRemoveAdminError);
		expect(new CannotRemoveAdminError().code).toBe("GROUP.CANNOT_REMOVE_ADMIN");
	});
});
