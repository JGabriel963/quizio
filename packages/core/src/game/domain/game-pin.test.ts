import { describe, expect, it } from "vitest";

import {
	ASSIGNMENT_PIN_LENGTH,
	formatGamePin,
	parseGamePin,
	parseJoinPin,
} from "./game-pin";

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

describe("join PIN (spec 029, RN-18, RN-20)", () => {
	it("parseJoinPin reads six digits as live", () => {
		expect(parseJoinPin("265 914")).toEqual({ pin: "265914", mode: "live" });
	});

	it("parseJoinPin reads eight digits as an assignment, leading zero included", () => {
		expect(ASSIGNMENT_PIN_LENGTH).toBe(8);
		expect(parseJoinPin("0435 2236")).toEqual({
			pin: "04352236",
			mode: "assignment",
		});
	});

	it.each(["", "1234567", "123456789", "065914", "0435223a"])(
		"parseJoinPin refuses %j",
		(raw) => {
			expect(parseJoinPin(raw)).toBeNull();
		},
	);

	it("formats an eight-digit PIN in two groups", () => {
		expect(formatGamePin("04352236")).toBe("0435 2236");
	});
});
