import { animate } from "motion/react";
import { type ComponentProps, useEffect, useRef, useState } from "react";

import { GAME_MOTION, usePrefersReducedMotion } from "./game-motion";

/**
 * A number that counts up to `value` (spec 011, RN-29, RN-33, RN-35). It
 * starts from `from` or, without it, from what it was showing: a number that
 * is first shown with no `from` just appears. While `start` is false it holds
 * where it is. With reduced motion it shows `value` at once (RN-27).
 */
export function CountUp({
	value,
	from,
	start = true,
	durationMs = GAME_MOTION.countMs,
	prefix = "",
	...props
}: {
	value: number;
	from?: number;
	start?: boolean;
	durationMs?: number;
	/** Text before the number, in the same element ("+ 639"). */
	prefix?: string;
} & Omit<ComponentProps<"span">, "children">) {
	const reduced = usePrefersReducedMotion();
	const [shown, setShown] = useState(() =>
		start && reduced ? value : (from ?? value),
	);
	const latest = useRef(shown);

	useEffect(() => {
		if (!start) {
			return;
		}
		const show = (next: number) => {
			latest.current = next;
			setShown(next);
		};
		if (reduced || latest.current === value) {
			show(value);
			return;
		}
		const controls = animate(latest.current, value, {
			duration: durationMs / 1000,
			ease: "easeOut",
			onUpdate: (current) => show(Math.round(current)),
			onComplete: () => show(value),
		});
		return () => controls.stop();
	}, [value, start, reduced, durationMs]);

	return (
		<span {...props}>
			{prefix}
			{shown}
		</span>
	);
}
