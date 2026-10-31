import { vi } from "vitest";

/**
 * Makes the media queries `matches` says yes to match, which jsdom knows
 * nothing about. Undo with `vi.unstubAllGlobals()` after the test.
 */
export function stubMediaQueries(matches: (query: string) => boolean): void {
	vi.stubGlobal(
		"matchMedia",
		(query: string): Partial<MediaQueryList> => ({
			media: query,
			matches: matches(query),
			addEventListener: () => {},
			removeEventListener: () => {},
		}),
	);
}

/** Makes the device ask (or not) for reduced motion. */
export function stubReducedMotion(reduced: boolean): void {
	stubMediaQueries(
		(query) => reduced && query.includes("prefers-reduced-motion"),
	);
}

/** Makes the device a phone or a tablet (or not): a finger, no hover. */
export function stubTouchDevice(touch: boolean): void {
	stubMediaQueries((query) => touch && query.includes("pointer: coarse"));
}
