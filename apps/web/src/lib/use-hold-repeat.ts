import { type PointerEvent, useCallback, useEffect, useRef } from "react";

/** How long a button is held before it repeats, and how often it repeats. */
export const HOLD_DELAY_MS = 400;
export const HOLD_EVERY_MS = 80;

/**
 * A button that acts once when pressed and keeps acting while held, as the
 * slider's limit buttons do (spec 032, RN-25). `step` says whether it moved:
 * the repeat stops at the end. A keyboard press acts once.
 */
export function useHoldRepeat(step: () => boolean) {
	const stepRef = useRef(step);
	stepRef.current = step;
	const timers = useRef<{
		delay?: ReturnType<typeof setTimeout>;
		every?: ReturnType<typeof setInterval>;
	}>({});

	const stop = useCallback(() => {
		clearTimeout(timers.current.delay);
		clearInterval(timers.current.every);
		timers.current = {};
	}, []);

	useEffect(() => stop, [stop]);

	return {
		onPointerDown(event: PointerEvent<HTMLElement>) {
			if (event.button !== 0) {
				return;
			}
			stop();
			if (!stepRef.current()) {
				return;
			}
			timers.current.delay = setTimeout(() => {
				timers.current.every = setInterval(() => {
					if (!stepRef.current()) {
						stop();
					}
				}, HOLD_EVERY_MS);
			}, HOLD_DELAY_MS);
		},
		onPointerUp: stop,
		onPointerLeave: stop,
		onPointerCancel: stop,
		onClick(event: { detail: number }) {
			// A click with no pointer behind it is the keyboard's Enter or Space.
			if (event.detail === 0) {
				stepRef.current();
			}
		},
	};
}
