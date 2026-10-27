import {
	DEFAULT_THEME_ID,
	type ThemeId,
} from "@quizio/core/shared/domain/theme";
import { createContext, type ReactNode, useContext } from "react";

const GameThemeContext = createContext<ThemeId>(DEFAULT_THEME_ID);

/**
 * The theme of the game on the screen (spec 042): the routes set it from the
 * game they read, and every `GameScreen` inside wears it. Without it, the
 * screens are the standard purple (the PIN entry, RN-14).
 */
export function GameThemeProvider({
	themeId,
	children,
}: {
	themeId: ThemeId;
	children: ReactNode;
}) {
	return (
		<GameThemeContext.Provider value={themeId}>
			{children}
		</GameThemeContext.Provider>
	);
}

export function useGameTheme(): ThemeId {
	return useContext(GameThemeContext);
}
