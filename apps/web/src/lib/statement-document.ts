import {
	formattedSegments,
	normalizeTextFormatting,
	TEXT_MARKS,
	type TextFormatting,
	type TextMark,
	type TextRange,
} from "@quizio/core/shared/domain/text-formatting";
import type { JSONContent } from "@tiptap/core";

/**
 * The statement's editor document and the pair the server keeps (spec 047,
 * ADR 0025): one paragraph whose text nodes carry the marks. The editor's
 * mark names are the core's `TextMark`s.
 */
export function statementToDocument(
	text: string,
	formatting: TextFormatting,
): JSONContent {
	const content = formattedSegments(text, formatting).map(
		(segment): JSONContent =>
			segment.marks.length > 0
				? {
						type: "text",
						text: segment.text,
						marks: segment.marks.map((mark) => ({ type: mark })),
					}
				: { type: "text", text: segment.text },
	);
	return {
		type: "doc",
		content: [
			content.length > 0
				? { type: "paragraph", content }
				: { type: "paragraph" },
		],
	};
}

function isTextMark(type: string | undefined): type is TextMark {
	return (TEXT_MARKS as readonly (string | undefined)[]).includes(type);
}

/** The text of the document and the stretches each mark covers, normalized. */
export function documentToStatement(document: JSONContent): {
	text: string;
	formatting: TextFormatting;
} {
	let text = "";
	const ranges: Partial<Record<TextMark, TextRange[]>> = {};
	for (const block of document.content ?? []) {
		for (const node of block.content ?? []) {
			const piece = node.text ?? "";
			for (const { type } of node.marks ?? []) {
				if (isTextMark(type) && piece !== "") {
					ranges[type] = [
						...(ranges[type] ?? []),
						[text.length, text.length + piece.length],
					];
				}
			}
			text += piece;
		}
	}
	return { text, formatting: normalizeTextFormatting(text, ranges) };
}
