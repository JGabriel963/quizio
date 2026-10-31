import { graphemeBoundaries } from "./text-length";

/**
 * The formatting a statement may have (spec 047, RN-03), in the order a
 * piece of text nests them when drawn.
 */
export const TEXT_MARKS = [
	"bold",
	"italic",
	"subscript",
	"superscript",
] as const;
export type TextMark = (typeof TEXT_MARKS)[number];

/** [start, end) in UTF-16 units of the text, the way JavaScript indexes a string. */
export type TextRange = readonly [start: number, end: number];

/**
 * The marked stretches of a text, per mark, kept beside the plain text
 * (ADR 0025). Normalized: each list sorted, its ranges never touching, every
 * edge on a grapheme boundary, and subscript never overlapping superscript
 * (RN-04). An absent mark has no stretch.
 */
export type TextFormatting = Readonly<
	Partial<Record<TextMark, readonly TextRange[]>>
>;

export const NO_FORMATTING: TextFormatting = {};

/** A piece of the text with the marks it has, in the order of `TEXT_MARKS`. */
export interface FormattedSegment {
	text: string;
	marks: readonly TextMark[];
}

export type TextFormattingIssue =
	| "unknownMark"
	| "badRange"
	| "subscriptAndSuperscript";

function isTextMark(key: string): key is TextMark {
	return (TEXT_MARKS as readonly string[]).includes(key);
}

function isRangeOf(text: string, range: unknown): range is TextRange {
	if (!Array.isArray(range) || range.length !== 2) {
		return false;
	}
	const [start, end] = range as unknown[];
	return (
		Number.isInteger(start) &&
		Number.isInteger(end) &&
		(start as number) >= 0 &&
		(start as number) < (end as number) &&
		(end as number) <= text.length
	);
}

/**
 * What is wrong with the shape of a formatting received for `text`: an object
 * with only known marks, each a list of integer pairs inside the text. Edges
 * off a grapheme boundary are not wrong: normalizing moves them.
 */
export function textFormattingIssue(
	text: string,
	raw: unknown,
): TextFormattingIssue | null {
	if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
		return "badRange";
	}
	for (const [key, ranges] of Object.entries(raw)) {
		if (!isTextMark(key)) {
			return "unknownMark";
		}
		if (ranges === undefined) {
			continue;
		}
		if (
			!Array.isArray(ranges) ||
			!ranges.every((range) => isRangeOf(text, range))
		) {
			return "badRange";
		}
	}
	return null;
}

/** The greatest boundary at or before `position`. */
function boundaryAtOrBefore(boundaries: number[], position: number): number {
	let found = 0;
	for (const boundary of boundaries) {
		if (boundary > position) {
			break;
		}
		found = boundary;
	}
	return found;
}

/** The smallest boundary at or after `position`. */
function boundaryAtOrAfter(boundaries: number[], position: number): number {
	return (
		boundaries.find((boundary) => boundary >= position) ??
		(boundaries.at(-1) as number)
	);
}

function normalizedRanges(
	boundaries: number[],
	ranges: readonly TextRange[],
): TextRange[] {
	const length = boundaries.at(-1) as number;
	const sorted = ranges
		.map(([start, end]): TextRange => {
			const from = boundaryAtOrBefore(boundaries, Math.max(0, start));
			const to = boundaryAtOrAfter(boundaries, Math.min(length, end));
			return [from, to];
		})
		.filter(([start, end]) => start < end)
		.sort((a, b) => a[0] - b[0]);
	const merged: [number, number][] = [];
	for (const [start, end] of sorted) {
		const last = merged.at(-1);
		if (last && start <= last[1]) {
			last[1] = Math.max(last[1], end);
		} else {
			merged.push([start, end]);
		}
	}
	return merged;
}

/**
 * The same marked stretches, normalized for `text`: edges moved out to
 * grapheme boundaries (a stretch never splits an emoji or an accent), each
 * list sorted with touching and overlapping ranges merged, empty lists
 * dropped. Idempotent.
 */
export function normalizeTextFormatting(
	text: string,
	formatting: TextFormatting,
): TextFormatting {
	const boundaries = graphemeBoundaries(text);
	const result: Partial<Record<TextMark, readonly TextRange[]>> = {};
	for (const mark of TEXT_MARKS) {
		const ranges = normalizedRanges(boundaries, formatting[mark] ?? []);
		if (ranges.length > 0) {
			result[mark] = ranges;
		}
	}
	return result;
}

/** A subscript stretch crosses a superscript one, which RN-04 forbids. */
export function overlapsSubAndSuper(formatting: TextFormatting): boolean {
	const subscripts = formatting.subscript ?? [];
	const superscripts = formatting.superscript ?? [];
	return subscripts.some(([start, end]) =>
		superscripts.some(([from, to]) => start < to && from < end),
	);
}

/**
 * Cuts the spaces at both ends, as the statement's parser does (spec 003,
 * RN-10), moving the stretches with the text: what was cut at the start
 * shifts them back, and what went at the end clips them (RN-10).
 */
export function trimFormattedText(
	text: string,
	formatting: TextFormatting,
): { text: string; formatting: TextFormatting } {
	const trimmed = text.trim();
	if (trimmed === "") {
		return { text: "", formatting: NO_FORMATTING };
	}
	const cutAtStart = text.length - text.trimStart().length;
	const shifted: Partial<Record<TextMark, readonly TextRange[]>> = {};
	for (const mark of TEXT_MARKS) {
		const ranges = formatting[mark];
		if (ranges) {
			shifted[mark] = ranges.map(
				([start, end]): TextRange => [
					Math.max(0, start - cutAtStart),
					Math.min(trimmed.length, end - cutAtStart),
				],
			);
		}
	}
	return {
		text: trimmed,
		formatting: normalizeTextFormatting(trimmed, shifted),
	};
}

/**
 * Reads a formatting stored with `text` (a question row, a playable version,
 * a game's copy) as tolerantly as the other stored fields: anything that does
 * not fit the text is read as no formatting, which is also how everything
 * stored before spec 047 reads (RN-22).
 */
export function readTextFormatting(
	text: string | null,
	raw: unknown,
): TextFormatting {
	if (text === null || textFormattingIssue(text, raw) !== null) {
		return NO_FORMATTING;
	}
	const formatting = normalizeTextFormatting(text, raw as TextFormatting);
	return overlapsSubAndSuper(formatting) ? NO_FORMATTING : formatting;
}

/** Same stretches for every mark; both values normalized. */
export function sameTextFormatting(
	a: TextFormatting,
	b: TextFormatting,
): boolean {
	return TEXT_MARKS.every((mark) => {
		const left = a[mark] ?? [];
		const right = b[mark] ?? [];
		return (
			left.length === right.length &&
			left.every(
				([start, end], index) =>
					start === right[index]?.[0] && end === right[index]?.[1],
			)
		);
	});
}

/** An independent copy, as `copyImage` makes of a question's image. */
export function copyTextFormatting(formatting: TextFormatting): TextFormatting {
	const copy: Partial<Record<TextMark, readonly TextRange[]>> = {};
	for (const mark of TEXT_MARKS) {
		const ranges = formatting[mark];
		if (ranges) {
			copy[mark] = ranges.map(([start, end]): TextRange => [start, end]);
		}
	}
	return copy;
}

/**
 * The text cut at every edge of a stretch, each piece with its marks: what the
 * screens, the editor and the agents' markup draw from.
 */
export function formattedSegments(
	text: string,
	formatting: TextFormatting,
): FormattedSegment[] {
	const edges = new Set<number>([0, text.length]);
	for (const mark of TEXT_MARKS) {
		for (const [start, end] of formatting[mark] ?? []) {
			edges.add(Math.min(start, text.length));
			edges.add(Math.min(end, text.length));
		}
	}
	const sorted = [...edges].sort((a, b) => a - b);
	const segments: FormattedSegment[] = [];
	for (let index = 0; index < sorted.length - 1; index++) {
		const start = sorted[index] as number;
		const end = sorted[index + 1] as number;
		if (start === end) {
			continue;
		}
		segments.push({
			text: text.slice(start, end),
			marks: TEXT_MARKS.filter((mark) =>
				(formatting[mark] ?? []).some(
					([from, to]) => from <= start && end <= to,
				),
			),
		});
	}
	return segments;
}
