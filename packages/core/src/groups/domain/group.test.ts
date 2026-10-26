import { describe, expect, it } from "vitest";

import {
	GROUP_DESCRIPTION_MAX_LENGTH,
	GROUP_NAME_MAX_LENGTH,
	InvalidGroupDescriptionError,
	InvalidGroupNameError,
	parseGroupDescription,
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

describe("group description (spec 035, RN-04, RN-05)", () => {
	it("a description keeps its line breaks and loses the spaces at its ends", () => {
		expect(parseGroupDescription("  Revisão para a prova\nde quinta \n")).toBe(
			"Revisão para a prova\nde quinta",
		);
	});

	it("only spaces is an empty description", () => {
		expect(parseGroupDescription(" \n  ")).toBe("");
		expect(parseGroupDescription("")).toBe("");
	});

	it("accepts 500 characters, an emoji counting as one", () => {
		const description = `${"a".repeat(GROUP_DESCRIPTION_MAX_LENGTH - 1)}👩‍🏫`;

		expect(parseGroupDescription(description)).toBe(description);
	});

	it("refuses 501 with GROUP.INVALID_DESCRIPTION", () => {
		expect(() => parseGroupDescription("a".repeat(501))).toThrow(
			InvalidGroupDescriptionError,
		);
		expect(new InvalidGroupDescriptionError().code).toBe(
			"GROUP.INVALID_DESCRIPTION",
		);
	});
});
