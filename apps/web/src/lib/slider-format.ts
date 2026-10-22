/** How a slider's numbers read in Portuguese (spec 032, RN-04, RN-37). */

const NUMBER = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const WHOLE = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

/**
 * "8.849", "2.000,03", "−100,3": a decimal comma, a thousands dot and the
 * typographic minus. `whole` rounds, as the margin's edges show (RN-12).
 */
export function formatSliderNumber(
	value: number,
	{ whole = false }: { whole?: boolean } = {},
): string {
	return (whole ? WHOLE : NUMBER).format(value).replace("-", "\u2212");
}

/** A number as the editor's fields show it: the comma, no thousands dot. */
export function sliderFieldText(value: number | null): string {
	return value === null ? "" : String(value).replace(".", ",");
}

/** Every position of a scale, from its first to its last (spec 032, RN-10). */
export function sliderPositions(scale: {
	first: number;
	last: number;
	step: number;
}): number[] {
	const first = Math.round(scale.first * 100);
	const last = Math.round(scale.last * 100);
	const step = Math.round(scale.step * 100);
	const positions: number[] = [];
	for (let at = first; at <= last; at += step) {
		positions.push(at / 100);
	}
	return positions;
}

/**
 * Which positions get a number under them on a device (spec 032, RN-24): the
 * round ones, multiples of 10 steps (160, 240… with a step of 8), as Kahoot
 * shows; when none falls on such a number (an answer with decimals), every
 * tenth position from the first.
 */
export function sliderMarkIndexes(scale: {
	first: number;
	last: number;
	step: number;
}): Set<number> {
	const every = Math.round(scale.step * 100) * 10;
	const positions = sliderPositions(scale);
	const round = positions.flatMap((position, index) =>
		Math.round(position * 100) % every === 0 ? [index] : [],
	);
	return new Set(
		round.length > 0
			? round
			: positions.flatMap((_, index) => (index % 10 === 0 ? [index] : [])),
	);
}
