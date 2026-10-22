/**
 * The scale of a slider question (spec 032): its step, the positions a player
 * may pick, the margin and how an answer did. The quiz (what the editor
 * shows), the game (grading) and the reports (the margin) all need it, so it
 * lives in the shared kernel.
 *
 * Numbers have at most 2 decimals, so every sum here is made in whole
 * hundredths: "600 − 8 × 62" or "10% of 2100.33" never grow ghost decimals,
 * and a position the device sends is never refused by a rounding error. With
 * at most 10 typed characters, a value is far below 2^53 hundredths.
 */

export const ANSWER_MARGINS = [
	"none",
	"low",
	"medium",
	"high",
	"maximum",
] as const;
export type AnswerMargin = (typeof ANSWER_MARGINS)[number];

/** Percent of the range each margin allows (RN-11); `maximum` reaches the far end. */
export const MARGIN_PERCENT = {
	none: 0,
	low: 5,
	medium: 10,
	high: 20,
} as const;

/** A complete scale: min < max and min ≤ answer ≤ max. */
export interface SliderScale {
	min: number;
	max: number;
	answer: number;
	margin: AnswerMargin;
}

function toHundredths(value: number): number {
	return Math.round(value * 100);
}

function fromHundredths(hundredths: number): number {
	return hundredths / 100;
}

/** The step in hundredths. */
function stepOf(minH: number, maxH: number): number {
	const range = maxH - minH;
	// Range ÷ 100 in whole units is range ÷ 10 000 in hundredths.
	if (range <= 10_000) {
		return 100;
	}
	let power = 1;
	while (range >= power * 10 * 10_000) {
		power *= 10;
	}
	return Math.ceil(range / (power * 10_000)) * power * 100;
}

/** Range ÷ 100 rounded up at its first significant digit, never below 1 (RN-09). */
export function sliderStep(min: number, max: number): number {
	return fromHundredths(stepOf(toHundredths(min), toHundredths(max)));
}

interface Hundredths {
	min: number;
	max: number;
	answer: number;
	step: number;
	first: number;
	last: number;
}

function hundredthsOf(scale: SliderScale): Hundredths {
	const min = toHundredths(scale.min);
	const max = toHundredths(scale.max);
	const answer = toHundredths(scale.answer);
	const step = stepOf(min, max);
	return {
		min,
		max,
		answer,
		step,
		first: answer - step * Math.floor((answer - min) / step),
		last: answer + step * Math.floor((max - answer) / step),
	};
}

/** The answer minus whole steps, as far as the range goes (RN-10). */
export function firstPosition(scale: SliderScale): number {
	return fromHundredths(hundredthsOf(scale).first);
}

/** The answer plus whole steps, as far as the range goes (RN-10). */
export function lastPosition(scale: SliderScale): number {
	return fromHundredths(hundredthsOf(scale).last);
}

/** A value a player may pick: the answer plus or minus whole steps, within the range (RN-10). */
export function isSliderPosition(scale: SliderScale, value: number): boolean {
	if (!Number.isFinite(value)) {
		return false;
	}
	const valueH = toHundredths(value);
	if (Math.abs(value * 100 - valueH) > 1e-6) {
		return false;
	}
	const { answer, step, first, last } = hundredthsOf(scale);
	return valueH >= first && valueH <= last && (valueH - answer) % step === 0;
}

/** The position closest to the middle of the range; the lower one on a tie (RN-24). */
export function startPosition(scale: SliderScale): number {
	const { min, max, step, first, last } = hundredthsOf(scale);
	// Doubled, so that the middle of an odd range stays whole.
	const middle2 = min + max;
	const below = Math.min(
		last,
		Math.max(first, first + step * Math.floor((middle2 / 2 - first) / step)),
	);
	const above = Math.min(last, below + step);
	const start =
		Math.abs(2 * above - middle2) < Math.abs(2 * below - middle2)
			? above
			: below;
	return fromHundredths(start);
}

/** How far from the answer still counts, in hundredths; may have decimals. */
function marginOf(margin: AnswerMargin, h: Hundredths): number {
	if (margin === "maximum") {
		return Math.max(h.answer - h.min, h.max - h.answer);
	}
	return (MARGIN_PERCENT[margin] * (h.max - h.min)) / 100;
}

/** The answer ± the margin, clipped by the min and the max (RN-11). */
export function marginRange(scale: SliderScale): { low: number; high: number } {
	const h = hundredthsOf(scale);
	const margin = marginOf(scale.margin, h);
	return {
		low: fromHundredths(Math.max(h.min, h.answer - margin)),
		high: fromHundredths(Math.min(h.max, h.answer + margin)),
	};
}

/** Equal to the answer, within the margin, or past it (RN-19). */
export function sliderCorrectness(
	scale: SliderScale,
	value: number,
): "correct" | "almostCorrect" | "wrong" {
	const h = hundredthsOf(scale);
	const distance = Math.abs(toHundredths(value) - h.answer);
	if (distance === 0) {
		return "correct";
	}
	if (scale.margin === "maximum") {
		return "almostCorrect";
	}
	// Compared without dividing, so 10% of 2100.33 keeps its last decimal.
	return 100 * distance <= MARGIN_PERCENT[scale.margin] * (h.max - h.min)
		? "almostCorrect"
		: "wrong";
}

/** 1 at the answer, down to 0 at the margin's edge and past it (RN-20). */
export function sliderPrecision(scale: SliderScale, value: number): number {
	const h = hundredthsOf(scale);
	const distance = Math.abs(toHundredths(value) - h.answer);
	if (distance === 0) {
		return 1;
	}
	const margin = marginOf(scale.margin, h);
	return margin === 0 ? 0 : Math.max(0, 1 - distance / margin);
}
