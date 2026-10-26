import { describe, expect, it } from "vitest";

import { groupInviteLink } from "./group-invite-link";

describe("groupInviteLink (spec 034, RN-21)", () => {
	it("builds the invite link from the origin and code", () => {
		expect(groupInviteLink("https://quizio.app", "Ab_9-x")).toBe(
			"https://quizio.app/invite/Ab_9-x",
		);
	});
});
