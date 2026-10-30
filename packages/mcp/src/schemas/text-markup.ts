import type { Question } from "@quizio/core/quiz/domain/question";
import {
	formattedSegments,
	NO_FORMATTING,
	type TextFormatting,
	type TextMark,
	type TextRange,
} from "@quizio/core/shared/domain/text-formatting";

import { ToolInputError } from "../tool-input-error";

/**
 * How an agent reads and writes the formatting of a statement or an answer
 * (spec 047, RN-28 to RN-30; spec 048, RN-22 to RN-24; ADR 0025): the plain
 * text with the four marks as inline tags, which a language model already
 * knows, instead of positions it would miscount.
 */
const TAG_OF: Record<TextMark, string> = {
	bold: "b",
	italic: "i",
	subscript: "sub",
	superscript: "sup",
};
const MARK_OF = new Map<string, TextMark>(
	Object.entries(TAG_OF).map(([mark, tag]) => [tag, mark as TextMark]),
);

/** Anything shaped like a tag; only the four above are formatting. */
const TAG_LIKE = /<(\/?)([A-Za-z][A-Za-z0-9]*)\s*>/g;
/** A "<" of the text that would read as a tag is written "&lt;". */
const STARTS_A_TAG = /<(?=\/?[A-Za-z][A-Za-z0-9]*\s*>)/g;

export const TEXT_MARKUP_HELP =
	"Formatting goes in the text as <b>bold</b>, <i>italic</i>, <sub>subscript</sub> and <sup>superscript</sup> (H<sub>2</sub>O, x<sup>2</sup>); they nest, but subscript and superscript never cover the same characters. Write a literal < that would read as a tag as &lt;. The character limit counts the text without the tags.";

function unknownTag(tag: string): never {
	throw new ToolInputError(
		`Unknown tag <${tag}>: a statement or an answer takes only <b>, <i>, <sub> and <sup>.`,
	);
}

/** The text and its marked stretches from a text written with the four tags. */
export function parseTextMarkup(markup: string): {
	text: string;
	formatting: TextFormatting;
} {
	let text = "";
	const open: { mark: TextMark; tag: string; start: number }[] = [];
	const ranges: Partial<Record<TextMark, TextRange[]>> = {};
	let last = 0;
	for (const match of markup.matchAll(TAG_LIKE)) {
		text += markup.slice(last, match.index).replaceAll("&lt;", "<");
		last = match.index + match[0].length;
		const closing = match[1] === "/";
		const tag = (match[2] as string).toLowerCase();
		const mark = MARK_OF.get(tag) ?? unknownTag(tag);
		if (!closing) {
			open.push({ mark, tag, start: text.length });
			continue;
		}
		const opened = open.pop();
		if (opened?.mark !== mark) {
			throw new ToolInputError(
				`</${tag}> does not close the last opened tag: tags must nest, like <b><i>x</i></b>.`,
			);
		}
		if (opened.start < text.length) {
			ranges[mark] = [...(ranges[mark] ?? []), [opened.start, text.length]];
		}
	}
	text += markup.slice(last).replaceAll("&lt;", "<");
	const unclosed = open.at(-1);
	if (unclosed) {
		throw new ToolInputError(`<${unclosed.tag}> is never closed.`);
	}
	return { text, formatting: ranges };
}

/** A text written with the four tags, for an agent to read. */
export function textMarkup(text: string, formatting: TextFormatting): string {
	let markup = "";
	let open: TextMark[] = [];
	for (const segment of formattedSegments(text, formatting)) {
		// Keep open what this piece still has, in the same order; close the rest.
		let kept = 0;
		while (kept < open.length && segment.marks[kept] === open[kept]) {
			kept++;
		}
		for (const mark of open.slice(kept).reverse()) {
			markup += `</${TAG_OF[mark]}>`;
		}
		open = open.slice(0, kept);
		for (const mark of segment.marks.slice(kept)) {
			markup += `<${TAG_OF[mark]}>`;
			open.push(mark);
		}
		markup += segment.text.replace(STARTS_A_TAG, "&lt;");
	}
	for (const mark of open.reverse()) {
		markup += `</${TAG_OF[mark]}>`;
	}
	return markup;
}

/**
 * A view as an agent reads it: the statement written with the four tags in
 * `text`, and no separate formatting.
 */
export function withTextMarkup<
	T extends { text: string | null; textFormatting: TextFormatting },
>(view: T): Omit<T, "textFormatting"> {
	const { textFormatting, ...rest } = view;
	return {
		...rest,
		text: view.text === null ? null : textMarkup(view.text, textFormatting),
	};
}

/** The statement an agent sent, split into the text and its formatting for the core. */
export function statementFromMarkup(text: string | null | undefined): {
	text?: string | null;
	textFormatting?: TextFormatting;
} {
	if (typeof text !== "string") {
		return text === undefined ? {} : { text };
	}
	const parsed = parseTextMarkup(text);
	return { text: parsed.text, textFormatting: parsed.formatting };
}

function markedOrNull(text: string | null, formatting: TextFormatting) {
	return text === null ? null : textMarkup(text, formatting);
}

/**
 * A question's answers as an agent reads them (spec 048, RN-22): a quiz's
 * choices and a puzzle's items written with the four tags, and no separate
 * formatting. Other types have none to mark.
 */
export function withAnswerMarkup(question: Question) {
	switch (question.type) {
		case "quiz":
			return {
				...question,
				choices: question.choices.map(({ textFormatting, ...choice }) => ({
					...choice,
					text: markedOrNull(choice.text, textFormatting),
				})),
			};
		case "puzzle": {
			const { itemFormatting, ...rest } = question;
			return {
				...rest,
				items: question.items.map((item, index) =>
					markedOrNull(item, itemFormatting[index] ?? NO_FORMATTING),
				),
			};
		}
		default:
			return question;
	}
}

/** A whole question as an agent reads it: the statement and the answers with tags. */
export function questionMarkup(question: Question) {
	return withTextMarkup(withAnswerMarkup(question));
}

function fromMarkupOrNull(text: string | null) {
	return text === null
		? { text: null, formatting: NO_FORMATTING }
		: parseTextMarkup(text);
}

/**
 * The answers an agent sent, split into texts and formattings for the core
 * (spec 048, RN-23): a list sent replaces the old one whole, with the
 * formatting its tags carry.
 */
export function answersFromMarkup(input: {
	choices?: { text: string | null; correct: boolean }[];
	items?: (string | null)[];
}): {
	choices?: {
		text: string | null;
		textFormatting: TextFormatting;
		correct: boolean;
	}[];
	items?: (string | null)[];
	itemFormatting?: TextFormatting[];
} {
	const items = input.items?.map(fromMarkupOrNull);
	return {
		...(input.choices && {
			choices: input.choices.map((choice) => {
				const parsed = fromMarkupOrNull(choice.text);
				return {
					text: parsed.text,
					textFormatting: parsed.formatting,
					correct: choice.correct,
				};
			}),
		}),
		...(items && {
			items: items.map(({ text }) => text),
			itemFormatting: items.map(({ formatting }) => formatting),
		}),
	};
}
