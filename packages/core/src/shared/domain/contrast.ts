/**
 * The contrast rules of the themes (spec 042, RN-19; spec 043, RN-11), in
 * the shared kernel because the server refuses a custom color nobody could
 * read and the web picks the text color with the same math.
 */

/** The two text colors a theme may get over its background (spec 042, RN-19). */
export const LIGHT_TEXT = "#ffffff";
export const DARK_TEXT = "#1f1f1f";

/** Relative luminance of a `#rrggbb` color, as WCAG 2.2 defines it. */
export function relativeLuminance(hex: string): number {
	const value = Number.parseInt(hex.slice(1), 16);
	const [red, green, blue] = [16, 8, 0].map((shift) => {
		const channel = ((value >> shift) & 0xff) / 255;
		return channel <= 0.04045
			? channel / 12.92
			: ((channel + 0.055) / 1.055) ** 2.4;
	}) as [number, number, number];
	return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** From 1 (same color) to 21 (black on white), whatever the order. */
export function contrastRatio(a: string, b: string): number {
	const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort(
		(x, y) => y - x,
	) as [number, number];
	return (lighter + 0.05) / (darker + 0.05);
}

/** The lowest ratio of `text` over any of `colors`. */
export function worstContrast(text: string, colors: readonly string[]): number {
	return Math.min(...colors.map((color) => contrastRatio(text, color)));
}

/**
 * The text that stays most legible over all of `colors`: the one whose worst
 * ratio is the highest (RN-19).
 */
export function readableTextOn(
	colors: readonly string[],
): typeof LIGHT_TEXT | typeof DARK_TEXT {
	return worstContrast(LIGHT_TEXT, colors) >= worstContrast(DARK_TEXT, colors)
		? LIGHT_TEXT
		: DARK_TEXT;
}

/** The ratio body text needs, WCAG 2.2, criterion 1.4.3. */
export const MIN_TEXT_CONTRAST = 4.5;

/** Whether light or dark text can be read on `hex` (spec 043, RN-11). */
export function isLegibleColor(hex: string): boolean {
	return (
		Math.max(contrastRatio(hex, LIGHT_TEXT), contrastRatio(hex, DARK_TEXT)) >=
		MIN_TEXT_CONTRAST
	);
}
