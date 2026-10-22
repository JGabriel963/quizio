import { sliderPositions } from "./slider-format";

/** Where a column's position is, against the answer and its margin (spec 032, RN-31). */
export type SliderColumnKind = "answer" | "margin" | "outside";

/** A number shows under every tenth position, counted from the answer, as in Kahoot. */
export const SLIDER_MARK_EVERY = 10;

export interface SliderColumn {
	value: number;
	count: number;
	kind: SliderColumnKind;
	/** Of the tallest column, from 0 to 1. */
	height: number;
	/** Its number shows under it (every tenth position from the answer, not the answer). */
	marked: boolean;
}

/**
 * One column per position of the scale, from the first to the last, with how
 * many sent it and where it falls (spec 032, RN-31).
 */
export function sliderColumns(
	scale: { first: number; last: number; step: number },
	results: {
		answer: number;
		low: number;
		high: number;
		counts: readonly { value: number; count: number }[];
	},
): SliderColumn[] {
	const counts = new Map(
		results.counts.map(({ value, count }) => [Math.round(value * 100), count]),
	);
	const tallest = Math.max(1, ...results.counts.map(({ count }) => count));
	const answer = Math.round(results.answer * 100);
	const step = Math.round(scale.step * 100);
	return sliderPositions(scale).map((value) => {
		const at = Math.round(value * 100);
		const count = counts.get(at) ?? 0;
		const stepsFromAnswer = Math.round((at - answer) / step);
		return {
			value,
			count,
			kind:
				at === answer
					? "answer"
					: value >= results.low && value <= results.high
						? "margin"
						: "outside",
			height: count / tallest,
			marked:
				stepsFromAnswer !== 0 && stepsFromAnswer % SLIDER_MARK_EVERY === 0,
		};
	});
}

/**
 * How far the results' card is moved so the column at `index` is in the
 * middle of the view, kept so that neither end of the scale passes the middle
 * (spec 032, RN-31). Widths in pixels; the card has `padding` on each side.
 */
export function stripOffsetFor(input: {
	viewWidth: number;
	columnCount: number;
	columnWidth: number;
	padding: number;
	index: number;
}): number {
	return clampStripOffset(
		input.viewWidth / 2 -
			(input.padding + input.index * input.columnWidth + input.columnWidth / 2),
		input,
	);
}

/** Keeps a dragged offset between the first column and the last one in the middle. */
export function clampStripOffset(
	offset: number,
	input: {
		viewWidth: number;
		columnCount: number;
		columnWidth: number;
		padding: number;
	},
): number {
	const center = (index: number) =>
		input.padding + index * input.columnWidth + input.columnWidth / 2;
	const most = input.viewWidth / 2 - center(0);
	const least =
		input.viewWidth / 2 - center(Math.max(0, input.columnCount - 1));
	return Math.min(most, Math.max(least, offset));
}

/** The column in the middle of the view at this offset, where the tag stays (RN-31). */
export function columnAtCenter(
	offset: number,
	input: {
		viewWidth: number;
		columnCount: number;
		columnWidth: number;
		padding: number;
	},
): number {
	const index = Math.round(
		(input.viewWidth / 2 - offset - input.padding - input.columnWidth / 2) /
			input.columnWidth,
	);
	return Math.min(input.columnCount - 1, Math.max(0, index));
}
