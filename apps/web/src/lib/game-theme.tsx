import type { ThemeLookView } from "@quizio/core/shared/application/theme-look-view";
import {
	DEFAULT_THEME_ID,
	type ThemeId,
} from "@quizio/core/shared/domain/theme";
import { createContext, type ReactNode, useContext, useMemo } from "react";

import { type ShownTheme, shownTheme } from "./theme-catalog";

const GameThemeContext = createContext<ShownTheme>(
	shownTheme(DEFAULT_THEME_ID, null),
);

/**
 * The theme of the game on the screen (spec 042): the routes set it from the
 * game they read, and every `GameScreen` inside wears it. Without it, the
 * screens are the standard purple (the PIN entry, RN-14). A custom theme
 * comes as its look (spec 043), with the logo only on the host's views.
 */
export function GameThemeProvider({
	themeId,
	custom = null,
	children,
}: {
	themeId: ThemeId;
	custom?: ThemeLookView | null;
	children: ReactNode;
}) {
	const value = useMemo(() => shownTheme(themeId, custom), [themeId, custom]);
	return (
		<GameThemeContext.Provider value={value}>
			{children}
		</GameThemeContext.Provider>
	);
}

export function useGameTheme(): ShownTheme {
	return useContext(GameThemeContext);
}
