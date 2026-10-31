import { describe, expect, it } from "vitest";

import {
	fromFormattedDocument,
	toFormattedDocument,
} from "./formatted-text-document";

describe("statement document (spec 047, RN-03)", () => {
	it("toFormattedDocument makes one paragraph with a text node per segment", () => {
		expect(
			toFormattedDocument("Quanto é 22?", {
				bold: [[0, 6]],
				superscript: [[10, 11]],
			}),
		).toEqual({
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{ type: "text", text: "Quanto", marks: [{ type: "bold" }] },
						{ type: "text", text: " é 2" },
						{ type: "text", text: "2", marks: [{ type: "superscript" }] },
						{ type: "text", text: "?" },
					],
				},
			],
		});
	});

	it("fromFormattedDocument turns marked text nodes into ranges", () => {
		expect(
			fromFormattedDocument({
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [
							{ type: "text", text: "H" },
							{ type: "text", text: "2", marks: [{ type: "subscript" }] },
							{ type: "text", text: "O" },
						],
					},
				],
			}),
		).toEqual({ text: "H2O", formatting: { subscript: [[1, 2]] } });
	});

	it("a text node with two marks gives a range in each", () => {
		expect(
			fromFormattedDocument({
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [
							{
								type: "text",
								text: "água",
								marks: [{ type: "bold" }, { type: "italic" }],
							},
						],
					},
				],
			}),
		).toEqual({
			text: "água",
			formatting: { bold: [[0, 4]], italic: [[0, 4]] },
		});
	});

	it("a superscript digit becomes a superscript range", () => {
		expect(
			fromFormattedDocument({
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [
							{ type: "text", text: "x" },
							{ type: "text", text: "2", marks: [{ type: "superscript" }] },
						],
					},
				],
			}),
		).toEqual({ text: "x2", formatting: { superscript: [[1, 2]] } });
	});

	it("round-trips text and formatting", () => {
		const statement = {
			text: "Qual destas não é uma capital?",
			formatting: { bold: [[12, 15]], italic: [[0, 4]] },
		} as const;

		expect(
			fromFormattedDocument(
				toFormattedDocument(statement.text, statement.formatting),
			),
		).toEqual(statement);
	});

	it("an empty document is an empty text", () => {
		expect(
			fromFormattedDocument({ type: "doc", content: [{ type: "paragraph" }] }),
		).toEqual({ text: "", formatting: {} });
		expect(toFormattedDocument("", {})).toEqual({
			type: "doc",
			content: [{ type: "paragraph" }],
		});
	});
});
