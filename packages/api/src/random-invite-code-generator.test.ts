import { describe, expect, it } from "vitest";

import { createRandomInviteCodeGenerator } from "./random-invite-code-generator";

describe("random invite code generator (spec 034, RN-23)", () => {
	it("draws 22 URL-safe characters", () => {
		expect(createRandomInviteCodeGenerator().generate()).toMatch(
			/^[A-Za-z0-9_-]{22}$/,
		);
	});

	it("two codes differ", () => {
		const generator = createRandomInviteCodeGenerator();

		expect(generator.generate()).not.toBe(generator.generate());
	});
});
