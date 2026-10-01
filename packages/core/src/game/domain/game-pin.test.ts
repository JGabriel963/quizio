import { describe, expect, it } from "vitest";

import { formatGamePin, parseGamePin } from "./game-pin";

describe("game PIN (spec 008)", () => {
	it("reads six digits ignoring spaces", () => {
		expect(parseGamePin("265914")).toBe("265914");
		expect(parseGamePin(" 265 914 ")).toBe("265914");
	});

	it.each(["", "12345", "1234567", "26591a", "065914", "265-914"])(
		"refuses %j",
		(raw) => {
			expect(parseGamePin(raw)).toBeNull();
		},
	);

	it("formats in two groups", () => {
		expect(formatGamePin("265914")).toBe("265 914");
	});
});
