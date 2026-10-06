import { MotionConfig } from "motion/react";
import { type ReactNode, useSyncExternalStore } from "react";

/**
 * How long the game's animations take (spec 011, RN-26): each movement about
 * a second at most, and the whole scoreboard sequence under three.
 */
export const GAME_MOTION = {
	/** A row sliding to its new place, a player rising on the podium. */
	moveSeconds: 0.6,
	/** A number counting up to its new value. */
	countMs: 1_000,
} as const;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void): () => void {
	const query = window.matchMedia?.(REDUCED_MOTION_QUERY);
	query?.addEventListener("change", onChange);
	return () => query?.removeEventListener("change", onChange);
}

/**
 * Whether the device asks for less movement (spec 011, RN-27). The game's
 * screens then show the final state of every animation at once.
 */
export function usePrefersReducedMotion(): boolean {
	return useSyncExternalStore(
		subscribeToReducedMotion,
		() => window.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false,
		() => false,
	);
}

/**
 * Around every game screen: one place for the animations' defaults and for
 * the device's preference for reduced motion. Animations are presentation
 * only: nothing in the game waits for one (RN-25).
 */
export function GameMotion({ children }: { children: ReactNode }) {
	const reduced = usePrefersReducedMotion();

	return (
		<MotionConfig
			reducedMotion={reduced ? "always" : "never"}
			transition={{
				duration: GAME_MOTION.moveSeconds,
				ease: [0.22, 1, 0.36, 1],
			}}
		>
			{children}
		</MotionConfig>
	);
}
