import { vi } from "vitest";

/**
 * Makes the device ask (or not) for reduced motion, which jsdom knows nothing
 * about. Undo with `vi.unstubAllGlobals()` after the test.
 */
export function stubReducedMotion(reduced: boolean): void {
	vi.stubGlobal(
		"matchMedia",
		(query: string): Partial<MediaQueryList> => ({
			media: query,
			matches: reduced && query.includes("prefers-reduced-motion"),
			addEventListener: () => {},
			removeEventListener: () => {},
		}),
	);
}
