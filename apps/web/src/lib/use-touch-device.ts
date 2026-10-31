import { useMediaQuery } from "./use-media-query";

/**
 * A phone or a tablet: the main pointer is a finger and cannot hover. Not the
 * screen's width, so a narrow window on a computer is still a computer, and
 * a laptop with a touch screen too (its main pointer is the mouse).
 */
export const TOUCH_DEVICE_QUERY = "(hover: none) and (pointer: coarse)";

export function useTouchDevice(): boolean {
	return useMediaQuery(TOUCH_DEVICE_QUERY);
}
