import { describe, expect, it } from "vitest";

import {
	GROUP_NAME_MAX_LENGTH,
	InvalidGroupNameError,
	parseGroupName,
} from "./group";

describe("group name (spec 034, RN-03)", () => {
	it("accepts names of 1 and 20 characters, trimmed", () => {
		expect(parseGroupName("  A ")).toBe("A");
		expect(parseGroupName(" Turma 7A do colégio ")).toBe("Turma 7A do colégio");
		expect(parseGroupName("a".repeat(GROUP_NAME_MAX_LENGTH))).toHaveLength(20);
	});

	it("counts an emoji as one character", () => {
		const name = `${"a".repeat(19)}👩‍🏫`;

		expect(parseGroupName(name)).toBe(name);
	});

	it("refuses a blank name and one of 21 characters with GROUP.INVALID_NAME", () => {
		for (const name of ["", "   ", "a".repeat(21)]) {
			expect(() => parseGroupName(name)).toThrow(InvalidGroupNameError);
		}
		expect(new InvalidGroupNameError().code).toBe("GROUP.INVALID_NAME");
	});
});
