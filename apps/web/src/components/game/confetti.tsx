import { cn } from "@quizio/ui/lib/utils";
import type { CSSProperties } from "react";

import { usePrefersReducedMotion } from "@/lib/game-motion";

const COLORS = [
	"bg-answer-red",
	"bg-answer-blue",
	"bg-answer-yellow",
	"bg-answer-green",
	"bg-white",
];

/**
 * Where and when each piece falls. Fixed by its number, not drawn at random,
 * so the server and the browser render the same thing.
 */
const PIECES = Array.from({ length: 70 }, (_, index) => ({
	id: index,
	color: COLORS[index % COLORS.length],
	style: {
		left: `${(index * 37) % 100}%`,
		animationDelay: `${(index % 14) * 0.12}s`,
		animationDuration: `${2.4 + (index % 5) * 0.45}s`,
		animationIterationCount: 2,
		"--confetti-drift": `${((index * 53) % 21) - 10}vw`,
	} as CSSProperties,
}));

/**
 * The celebration of the first place (spec 011, RN-33, RN-34). Decoration
 * only, over whatever is behind it; nothing with reduced motion (RN-27).
 */
export function Confetti() {
	const reduced = usePrefersReducedMotion();
	if (reduced) {
		return null;
	}

	return (
		<div
			data-slot="confetti"
			aria-hidden="true"
			className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
		>
			{PIECES.map((piece) => (
				<span
					key={piece.id}
					className={cn(
						"absolute top-0 block h-3 w-2 animate-confetti-fall rounded-xs",
						piece.color,
					)}
					style={piece.style}
				/>
			))}
		</div>
	);
}
