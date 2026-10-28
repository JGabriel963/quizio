import { parseHexColor } from "@quizio/core/shared/domain/theme-look";

const STORAGE_KEY = "quizio:custom-colors";
export const CUSTOM_COLORS_LIMIT = 8;

/**
 * "Cores personalizadas" (spec 043): the colors this browser picked in the
 * color picker, newest first. A convenience of the viewer, so it lives in
 * `localStorage` and an empty or blocked storage just shows none.
 */
export function loadCustomColors(): string[] {
	try {
		const stored: unknown = JSON.parse(
			localStorage.getItem(STORAGE_KEY) ?? "[]",
		);
		return Array.isArray(stored)
			? stored
					.map((value) =>
						typeof value === "string" ? parseHexColor(value) : null,
					)
					.filter((color): color is string => color !== null)
					.slice(0, CUSTOM_COLORS_LIMIT)
			: [];
	} catch {
		return [];
	}
}

export function rememberCustomColor(hex: string): string[] {
	const colors = [
		hex,
		...loadCustomColors().filter((color) => color !== hex),
	].slice(0, CUSTOM_COLORS_LIMIT);
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
	} catch {
		// Kept for this screen only.
	}
	return colors;
}
