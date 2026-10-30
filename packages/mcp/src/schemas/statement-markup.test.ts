import { describe, expect, it } from "vitest";

import { ToolInputError } from "../tool-input-error";
import { parseStatementMarkup, statementMarkup } from "./statement-markup";

describe("parseStatementMarkup (spec 047, RN-29, RN-30)", () => {
	it("parses nested tags into ranges", () => {
		expect(
			parseStatementMarkup(
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
		expect(parseStatementMarkup("x<sup>2</sup> + y<sup>2</sup>")).toEqual({
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
		expect(parseStatementMarkup("Capital do Brasil?")).toEqual({
			text: "Capital do Brasil?",
			formatting: {},
		});
	});

	it("tags are case-insensitive", () => {
		expect(parseStatementMarkup("<B>a</B><SUP>2</SUP>")).toEqual({
			text: "a2",
			formatting: { bold: [[0, 1]], superscript: [[1, 2]] },
		});
	});

	it("refuses an unknown tag listing the four", () => {
		expect(() => parseStatementMarkup("<u>sublinhado</u>")).toThrow(
			ToolInputError,
		);
		expect(() => parseStatementMarkup("<strong>forte</strong>")).toThrow(
			/<b>, <i>, <sub> and <sup>/,
		);
	});

	it("refuses an unclosed or misplaced closing tag", () => {
		expect(() => parseStatementMarkup("<b>aberto")).toThrow(ToolInputError);
		expect(() => parseStatementMarkup("fechado</i>")).toThrow(ToolInputError);
		expect(() => parseStatementMarkup("<b><i>a</b></i>")).toThrow(
			ToolInputError,
		);
	});

	it("keeps x < 3 and a<b as text", () => {
		expect(parseStatementMarkup("Para qual valor x < 3 e x > 1?")).toEqual({
			text: "Para qual valor x < 3 e x > 1?",
			formatting: {},
		});
		expect(parseStatementMarkup("a<b e b<c")).toEqual({
			text: "a<b e b<c",
			formatting: {},
		});
	});

	it("decodes &lt; and nothing else", () => {
		expect(parseStatementMarkup("&lt;b&gt; e &amp;")).toEqual({
			text: "<b&gt; e &amp;",
			formatting: {},
		});
	});
});

describe("statementMarkup", () => {
	it("renders sup and b tags in a fixed order", () => {
		expect(
			statementMarkup("Quanto é 22?", {
				bold: [[0, 6]],
				italic: [[3, 8]],
				superscript: [[10, 11]],
			}),
		).toBe("<b>Qua<i>nto</i></b><i> é</i> 2<sup>2</sup>?");
	});

	it("a text without formatting is itself", () => {
		expect(statementMarkup("Capital do Brasil?", {})).toBe(
			"Capital do Brasil?",
		);
	});

	it("round-trips a literal tag-like text", () => {
		const text = "Use <b> para negrito";

		const markup = statementMarkup(text, { italic: [[0, 3]] });

		expect(markup).toBe("<i>Use</i> &lt;b> para negrito");
		expect(parseStatementMarkup(markup)).toEqual({
			text,
			formatting: { italic: [[0, 3]] },
		});
	});
});
