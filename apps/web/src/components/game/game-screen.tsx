import type { ThemeId } from "@quizio/core/shared/domain/theme";
import { cn } from "@quizio/ui/lib/utils";
import type { ComponentProps } from "react";

import { GameMotion } from "@/lib/game-motion";
import { useGameTheme } from "@/lib/game-theme";
import { themeStyle } from "@/lib/theme-catalog";

/**
 * The surface of every in-game screen (spec 008, Experiência): the game's
 * theme behind it (spec 042), from `GameThemeProvider` unless given here.
 * It stays `.dark` whatever the theme, so cards and headers keep their look;
 * only what sits straight on the background follows the theme
 * (`text-game-fg`, `bg-game-accent`). Dialogs open in a portal, outside it,
 * so they stay light like Kahoot's. It also sets up the game's animations
 * (spec 011).
 */
export function GameScreen({
	className,
	style,
	themeId,
	...props
}: ComponentProps<"div"> & { themeId?: ThemeId }) {
	const providedThemeId = useGameTheme();
	const shownThemeId = themeId ?? providedThemeId;
	return (
		<GameMotion>
			<div
				data-slot="game-screen"
				data-theme={shownThemeId}
				style={{ ...themeStyle(shownThemeId), ...style }}
				className={cn(
					// Clipped sideways: what runs to the edges (a slider's results, spec 032)
					// never makes the page scroll.
					"dark bg-(image:--game-bg-image) min-h-svh overflow-x-clip bg-(--game-base) bg-center bg-cover text-game-fg",
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
			className={cn("font-black text-game-fg tracking-tight", className)}
			{...props}
		>
			Quizio!
		</span>
	);
}
