import { describe, expect, it } from "vitest";

import { USER_COLORS, userColor } from "./user-color";

describe("userColor (spec 034)", () => {
	it("gives a user always the same color of the palette", () => {
		expect(userColor("ana")).toBe(userColor("ana"));
		expect(USER_COLORS).toContain(userColor("ana"));
	});

	it("spreads users over the palette", () => {
		const colors = new Set(
			Array.from({ length: 40 }, (_, index) => userColor(`user-${index}`)),
		);

		expect(colors.size).toBeGreaterThan(1);
	});
});
