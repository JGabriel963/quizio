import { describe, expect, it } from "vitest";

import {
	copyTextFormatting,
	formattedSegments,
	NO_FORMATTING,
	normalizeTextFormatting,
	overlapsSubAndSuper,
	readTextFormatting,
	sameTextFormatting,
	type TextFormatting,
	textFormattingIssue,
	trimFormattedText,
} from "./text-formatting";

describe("textFormattingIssue", () => {
	it("accepts ranges inside the text and no mark", () => {
		expect(textFormattingIssue("Quanto é 22?", {})).toBeNull();
		expect(
			textFormattingIssue("Quanto é 22?", {
				bold: [[0, 6]],
				superscript: [[10, 11]],
			}),
		).toBeNull();
		expect(textFormattingIssue("abc", { italic: [[0, 3]] })).toBeNull();
	});

	it("reports an unknown mark, a reversed, empty or outside range and a non-integer", () => {
		expect(textFormattingIssue("abc", { underline: [[0, 1]] })).toBe(
			"unknownMark",
		);
		expect(textFormattingIssue("abc", { bold: [[2, 1]] })).toBe("badRange");
		expect(textFormattingIssue("abc", { bold: [[1, 1]] })).toBe("badRange");
		expect(textFormattingIssue("abc", { bold: [[0, 4]] })).toBe("badRange");
		expect(textFormattingIssue("abc", { bold: [[-1, 2]] })).toBe("badRange");
		expect(textFormattingIssue("abc", { bold: [[0.5, 2]] })).toBe("badRange");
		expect(textFormattingIssue("abc", { bold: [[0]] })).toBe("badRange");
		expect(textFormattingIssue("abc", { bold: "0-1" })).toBe("badRange");
		expect(textFormattingIssue("abc", null)).toBe("badRange");
		expect(textFormattingIssue("abc", [[0, 1]])).toBe("badRange");
	});
});

describe("normalizeTextFormatting", () => {
	it("sorts, merges touching and overlapping ranges and drops empty lists", () => {
		expect(
			normalizeTextFormatting("abcdefghij", {
				bold: [
					[6, 8],
					[0, 2],
					[2, 4],
					[7, 9],
				],
				italic: [],
			}),
		).toEqual({
			bold: [
				[0, 4],
				[6, 9],
			],
		});
	});

	it("moves the edges to grapheme boundaries, never splitting an emoji or an accent", () => {
		// "a👍🏽b": the thumb with its skin tone is 4 UTF-16 units, from 1 to 5.
		expect(normalizeTextFormatting("a👍🏽b", { bold: [[2, 3]] })).toEqual({
			bold: [[1, 5]],
		});
		// "e" + combining acute accent is one character, from 0 to 2.
		expect(normalizeTextFormatting("éx", { italic: [[1, 3]] })).toEqual({
			italic: [[0, 3]],
		});
	});

	it("is idempotent", () => {
		const once = normalizeTextFormatting("abcdef", {
			bold: [
				[3, 5],
				[0, 3],
			],
		});

		expect(normalizeTextFormatting("abcdef", once)).toEqual(once);
	});
});

describe("marks together", () => {
	it("bold and italic may cover the same range", () => {
		const formatting = { bold: [[0, 5]], italic: [[0, 5]] } as const;

		expect(textFormattingIssue("texto", formatting)).toBeNull();
		expect(normalizeTextFormatting("texto", formatting)).toEqual(formatting);
		expect(overlapsSubAndSuper(formatting)).toBe(false);
	});

	it("overlapsSubAndSuper is true only when a subscript crosses a superscript", () => {
		expect(
			overlapsSubAndSuper({ subscript: [[1, 2]], superscript: [[2, 3]] }),
		).toBe(false);
		expect(
			overlapsSubAndSuper({ subscript: [[1, 3]], superscript: [[2, 4]] }),
		).toBe(true);
		expect(
			overlapsSubAndSuper({
				subscript: [
					[0, 1],
					[5, 6],
				],
				superscript: [[4, 7]],
			}),
		).toBe(true);
		expect(overlapsSubAndSuper({ subscript: [[0, 3]] })).toBe(false);
	});
});

describe("trimFormattedText", () => {
	it("shifts the ranges by the spaces cut at the start and clips the end", () => {
		// "  ab cd  ": "ab" from 2 to 4, "cd " from 5 to 8.
		expect(
			trimFormattedText("  ab cd  ", {
				bold: [[2, 4]],
				italic: [[5, 8]],
				subscript: [[7, 9]],
			}),
		).toEqual({
			text: "ab cd",
			formatting: { bold: [[0, 2]], italic: [[3, 5]] },
		});
	});

	it("an empty text keeps no formatting", () => {
		expect(trimFormattedText("   ", { bold: [[0, 3]] })).toEqual({
			text: "",
			formatting: NO_FORMATTING,
		});
	});
});

describe("readTextFormatting", () => {
	it("reads a stored formatting, normalized", () => {
		expect(
			readTextFormatting("abcdef", {
				bold: [
					[3, 4],
					[0, 3],
				],
			}),
		).toEqual({ bold: [[0, 4]] });
	});

	it("gives no formatting for a null text, a bad shape or ranges past the text", () => {
		expect(readTextFormatting(null, { bold: [[0, 1]] })).toEqual(NO_FORMATTING);
		expect(readTextFormatting("abc", undefined)).toEqual(NO_FORMATTING);
		expect(readTextFormatting("abc", "bold")).toEqual(NO_FORMATTING);
		expect(readTextFormatting("abc", { bold: [[0, 9]] })).toEqual(
			NO_FORMATTING,
		);
		expect(
			readTextFormatting("abc", { subscript: [[0, 2]], superscript: [[1, 3]] }),
		).toEqual(NO_FORMATTING);
	});
});

describe("sameTextFormatting", () => {
	it("compares normalized values", () => {
		expect(sameTextFormatting({}, {})).toBe(true);
		expect(sameTextFormatting({ bold: [[0, 2]] }, { bold: [[0, 2]] })).toBe(
			true,
		);
		expect(sameTextFormatting({ bold: [[0, 2]] }, { italic: [[0, 2]] })).toBe(
			false,
		);
		expect(sameTextFormatting({ bold: [[0, 2]] }, { bold: [[0, 3]] })).toBe(
			false,
		);
		expect(
			sameTextFormatting(
				{ bold: [[0, 2]] },
				{
					bold: [
						[0, 2],
						[4, 5],
					],
				},
			),
		).toBe(false);
		expect(sameTextFormatting({ bold: [[0, 2]] }, {})).toBe(false);
	});
});

describe("copyTextFormatting", () => {
	it("is deep", () => {
		const source: TextFormatting = { bold: [[0, 2]] };

		const copy = copyTextFormatting(source);

		expect(copy).toEqual(source);
		expect(copy).not.toBe(source);
		expect(copy.bold).not.toBe(source.bold);
		expect(copy.bold?.[0]).not.toBe(source.bold?.[0]);
	});
});

describe("formattedSegments", () => {
	it("splits the text at every edge with the marks of each piece", () => {
		expect(
			formattedSegments("Quanto é 22 + 22?", {
				bold: [[0, 6]],
				italic: [[3, 8]],
				superscript: [
					[10, 11],
					[15, 16],
				],
			}),
		).toEqual([
			{ text: "Qua", marks: ["bold"] },
			{ text: "nto", marks: ["bold", "italic"] },
			{ text: " é", marks: ["italic"] },
			{ text: " 2", marks: [] },
			{ text: "2", marks: ["superscript"] },
			{ text: " + 2", marks: [] },
			{ text: "2", marks: ["superscript"] },
			{ text: "?", marks: [] },
		]);
	});

	it("an unformatted text is one piece, and an empty one none", () => {
		expect(formattedSegments("abc", NO_FORMATTING)).toEqual([
			{ text: "abc", marks: [] },
		]);
		expect(formattedSegments("", NO_FORMATTING)).toEqual([]);
	});
});
