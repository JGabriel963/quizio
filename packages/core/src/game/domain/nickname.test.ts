import { describe, expect, it } from "vitest";

import { InvalidNicknameError, nicknameKeyOf, parseNickname } from "./nickname";

describe("nickname (spec 008)", () => {
	it("trims and collapses spaces", () => {
		expect(parseNickname("  ACT  ")).toBe("ACT");
		expect(parseNickname("Ana   Clara")).toBe("Ana Clara");
	});

	it("accepts 1 to 15 perceived characters", () => {
		expect(parseNickname("a")).toBe("a");
		expect(parseNickname("a".repeat(15))).toBe("a".repeat(15));
		expect(parseNickname(`${"a".repeat(14)}👩‍👩‍👧`)).toHaveLength(22);
	});

	it.each(["", "   ", "a".repeat(16)])("refuses %j", (raw) => {
		expect(() => parseNickname(raw)).toThrow(InvalidNicknameError);
	});

	it("has the same key regardless of case and accents", () => {
		expect(nicknameKeyOf("José")).toBe(nicknameKeyOf("jose"));
		expect(nicknameKeyOf("ACT")).toBe(nicknameKeyOf("act"));
		expect(nicknameKeyOf("ACT")).not.toBe(nicknameKeyOf("ACT2"));
	});
});
