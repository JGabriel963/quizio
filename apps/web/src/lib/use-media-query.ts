import { useSyncExternalStore } from "react";

/**
 * Whether a media query matches now, following its changes. False on the
 * server and where the browser has no `matchMedia`.
 */
export function useMediaQuery(query: string): boolean {
	return useSyncExternalStore(
		(onChange) => {
			const list = window.matchMedia?.(query);
			list?.addEventListener("change", onChange);
			return () => list?.removeEventListener("change", onChange);
		},
		() => window.matchMedia?.(query).matches ?? false,
		() => false,
	);
}
