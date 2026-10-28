import type { ThemeLook } from "../domain/theme-look";

/** A custom look with a logo (spec 043), for the views that copy or draw it. */
export const A_THEME_LOOK: ThemeLook = {
	background: { kind: "pattern", pattern: "waves", color: "#1b2a6b" },
	accentColor: "#ffd84d",
	logoKey: "themes/user-1/logo.png",
};

/** How `A_THEME_LOOK` reaches a screen, with or without its logo. */
export function aThemeLookView(withLogo: boolean) {
	return {
		pattern: "waves",
		backgroundColor: "#1b2a6b",
		imageUrl: null,
		imageTone: null,
		accentColor: "#ffd84d",
		logoUrl: withLogo ? "https://media.test/themes/user-1/logo.png" : null,
	};
}
