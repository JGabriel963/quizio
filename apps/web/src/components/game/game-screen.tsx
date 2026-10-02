import { cn } from "@quizio/ui/lib/utils";
import type { ComponentProps } from "react";

import { GameMotion } from "@/lib/game-motion";

/**
 * The surface of every in-game screen: the dark theme over the brand purple
 * (spec 008, Experiência). Dialogs open in a portal, outside it, so they stay
 * light like Kahoot's. It also sets up the game's animations (spec 011).
 */
export function GameScreen({ className, ...props }: ComponentProps<"div">) {
	return (
		<GameMotion>
			<div
				data-slot="game-screen"
				className={cn(
					"dark min-h-svh bg-linear-to-b from-brand to-brand-strong text-white",
					className,
				)}
				{...props}
			/>
		</GameMotion>
	);
}

export function Wordmark({ className, ...props }: ComponentProps<"span">) {
	return (
		<span
			data-slot="wordmark"
			className={cn("font-black tracking-tight", className)}
			{...props}
		>
			Quizio!
		</span>
	);
}
