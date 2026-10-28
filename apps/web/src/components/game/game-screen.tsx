import type { ThemeLookView } from "@quizio/core/shared/application/theme-look-view";
import type { ThemeId } from "@quizio/core/shared/domain/theme";
import { cn } from "@quizio/ui/lib/utils";
import type { ComponentProps } from "react";

import { GameMotion } from "@/lib/game-motion";
import { useGameTheme } from "@/lib/game-theme";
import { shownTheme, themeStyle } from "@/lib/theme-catalog";

/**
 * The surface of every in-game screen (spec 008, Experiência): the game's
 * theme behind it (spec 042), from `GameThemeProvider` unless given here.
 * It stays `.dark` whatever the theme, so cards and headers keep their look;
 * only what sits straight on the background follows the theme
 * (`text-game-fg`, `bg-game-accent`). Dialogs open in a portal, outside it,
 * so they stay light like Kahoot's. It also sets up the game's animations
 * (spec 011). A custom theme (spec 043) comes as its look.
 */
export function GameScreen({
	className,
	style,
	themeId,
	customTheme,
	...props
}: ComponentProps<"div"> & {
	themeId?: ThemeId;
	customTheme?: ThemeLookView | null;
}) {
	const provided = useGameTheme();
	const shown =
		themeId === undefined ? provided : shownTheme(themeId, customTheme);
	return (
		<GameMotion>
			<div
				data-slot="game-screen"
				data-theme={shown.custom ? "custom" : shown.themeId}
				style={{ ...themeStyle(shown), ...style }}
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

/**
 * Quizio's name, or the logo of the game's custom theme in its place (spec
 * 043, RN-9, RN-26): whole, as tall as the name would be. Only the host's
 * views carry the logo, so the phone keeps the name.
 */
export function Wordmark({ className, ...props }: ComponentProps<"span">) {
	const logoUrl = useGameTheme().custom?.logoUrl;
	if (logoUrl) {
		return (
			<span
				data-slot="wordmark"
				className={cn("inline-flex h-[1.2em] items-center", className)}
				{...props}
			>
				<img
					src={logoUrl}
					alt="Logotipo"
					data-slot="game-logo"
					className="h-full max-w-[60vw] object-contain"
				/>
			</span>
		);
	}
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
