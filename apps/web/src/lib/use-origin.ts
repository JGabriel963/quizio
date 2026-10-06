import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * The page's origin (`https://quizio.app`), or null while it is not known:
 * on the server and during hydration. The server has no address to render,
 * so whatever shows one waits for the browser instead of rendering a
 * different text on each side.
 */
export function useOrigin(): string | null {
	return useSyncExternalStore(
		subscribe,
		() => window.location.origin,
		() => null,
	);
}
