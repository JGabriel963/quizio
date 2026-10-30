import {
	aFormattedAnswersQuestion,
	aPuzzleQuestion,
} from "@quizio/core/quiz/testing/a-question";
import { describe, expect, it } from "vitest";
import { ToolInputError } from "../tool-input-error";

import {
	answersFromMarkup,
	parseTextMarkup,
	questionMarkup,
	textMarkup,
	withAnswerMarkup,
} from "./text-markup";

describe("parseTextMarkup (spec 047, RN-29, RN-30)", () => {
	it("parses nested tags into ranges", () => {
		expect(
			parseTextMarkup(
				"Qual é a <b>fórmula da <i>água</i></b>, H<sub>2</sub>O?",
			),
		).toEqual({
			text: "Qual é a fórmula da água, H2O?",
			formatting: {
				bold: [[9, 24]],
				italic: [[20, 24]],
				subscript: [[27, 28]],
			},
		});
		expect(parseTextMarkup("x<sup>2</sup> + y<sup>2</sup>")).toEqual({
			text: "x2 + y2",
			formatting: {
				superscript: [
					[1, 2],
					[6, 7],
				],
			},
		});
	});

	it("a text without tags has no formatting", () => {
		expect(parseTextMarkup("Capital do Brasil?")).toEqual({
			text: "Capital do Brasil?",
			formatting: {},
		});
	});

	it("tags are case-insensitive", () => {
		expect(parseTextMarkup("<B>a</B><SUP>2</SUP>")).toEqual({
			text: "a2",
			formatting: { bold: [[0, 1]], superscript: [[1, 2]] },
		});
	});

	it("refuses an unknown tag listing the four", () => {
		expect(() => parseTextMarkup("<u>sublinhado</u>")).toThrow(ToolInputError);
		expect(() => parseTextMarkup("<strong>forte</strong>")).toThrow(
			/<b>, <i>, <sub> and <sup>/,
		);
	});

	it("refuses an unclosed or misplaced closing tag", () => {
		expect(() => parseTextMarkup("<b>aberto")).toThrow(ToolInputError);
		expect(() => parseTextMarkup("fechado</i>")).toThrow(ToolInputError);
		expect(() => parseTextMarkup("<b><i>a</b></i>")).toThrow(ToolInputError);
	});

	it("keeps x < 3 and a<b as text", () => {
		expect(parseTextMarkup("Para qual valor x < 3 e x > 1?")).toEqual({
			text: "Para qual valor x < 3 e x > 1?",
			formatting: {},
		});
		expect(parseTextMarkup("a<b e b<c")).toEqual({
			text: "a<b e b<c",
			formatting: {},
		});
	});

	it("decodes &lt; and nothing else", () => {
		expect(parseTextMarkup("&lt;b&gt; e &amp;")).toEqual({
			text: "<b&gt; e &amp;",
			formatting: {},
		});
	});
});

describe("textMarkup", () => {
	it("renders sup and b tags in a fixed order", () => {
		expect(
			textMarkup("Quanto é 22?", {
				bold: [[0, 6]],
				italic: [[3, 8]],
				superscript: [[10, 11]],
			}),
		).toBe("<b>Qua<i>nto</i></b><i> é</i> 2<sup>2</sup>?");
	});

	it("a text without formatting is itself", () => {
		expect(textMarkup("Capital do Brasil?", {})).toBe("Capital do Brasil?");
	});

	it("round-trips a literal tag-like text", () => {
		const text = "Use <b> para negrito";

		const markup = textMarkup(text, { italic: [[0, 3]] });

		expect(markup).toBe("<i>Use</i> &lt;b> para negrito");
		expect(parseTextMarkup(markup)).toEqual({
			text,
			formatting: { italic: [[0, 3]] },
		});
	});
});

describe("answers in markup (spec 048, RN-22 to RN-24)", () => {
	it("withAnswerMarkup turns choices and puzzle items into tags and drops their formatting", () => {
		const quiz = withAnswerMarkup(aFormattedAnswersQuestion());
		const puzzle = withAnswerMarkup(
			aPuzzleQuestion({
				items: ["H2O", "Sal", null, "x2"],
				itemFormatting: [
					{ subscript: [[1, 2]] },
					{},
					{},
					{ superscript: [[1, 2]] },
				],
			}),
		);

		expect(quiz).toMatchObject({
			choices: [
				{ text: "H<sub>2</sub>O", correct: true },
				{ text: "CO2", correct: false },
				{ text: null },
				{ text: null },
			],
		});
		expect(puzzle).toMatchObject({
			items: ["H<sub>2</sub>O", "Sal", null, "x<sup>2</sup>"],
		});
		// With the statement's, nothing of the formatting is left apart.
		expect(
			JSON.stringify([
				questionMarkup(aFormattedAnswersQuestion()),
				questionMarkup(aPuzzleQuestion()),
			]),
		).not.toMatch(/textFormatting|itemFormatting/);
	});

	it("answersFromMarkup splits choices and items into text and formatting", () => {
		expect(
			answersFromMarkup({
				choices: [
					{ text: "H<sub>2</sub>O", correct: true },
					{ text: null, correct: false },
				],
				items: ["<i>Homo</i> sapiens", null],
			}),
		).toEqual({
			choices: [
				{ text: "H2O", textFormatting: { subscript: [[1, 2]] }, correct: true },
				{ text: null, textFormatting: {}, correct: false },
			],
			items: ["Homo sapiens", null],
			itemFormatting: [{ italic: [[0, 4]] }, {}],
		});
		expect(answersFromMarkup({})).toEqual({});
	});

	it("an unknown tag in an answer is refused listing the four", () => {
		expect(() =>
			answersFromMarkup({ choices: [{ text: "<u>a</u>", correct: true }] }),
		).toThrow(/<b>, <i>, <sub> and <sup>/);
		expect(() => answersFromMarkup({ items: ["<s>a</s>"] })).toThrow(
			ToolInputError,
		);
	});

	it("x < 3 in an answer stays text", () => {
		expect(
			answersFromMarkup({ choices: [{ text: "x < 3", correct: true }] }),
		).toEqual({
			choices: [{ text: "x < 3", textFormatting: {}, correct: true }],
		});
	});
});
