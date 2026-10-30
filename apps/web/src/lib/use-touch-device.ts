import { useSyncExternalStore } from "react";

/**
 * A phone or a tablet: the main pointer is a finger and cannot hover. Not the
 * screen's width, so a narrow window on a computer is still a computer, and
 * a laptop with a touch screen too (its main pointer is the mouse).
 */
export const TOUCH_DEVICE_QUERY = "(hover: none) and (pointer: coarse)";

function subscribeToTouchDevice(onChange: () => void): () => void {
	const query = window.matchMedia?.(TOUCH_DEVICE_QUERY);
	query?.addEventListener("change", onChange);
	return () => query?.removeEventListener("change", onChange);
}

export function useTouchDevice(): boolean {
	return useSyncExternalStore(
		subscribeToTouchDevice,
		() => window.matchMedia?.(TOUCH_DEVICE_QUERY).matches ?? false,
		() => false,
	);
}
