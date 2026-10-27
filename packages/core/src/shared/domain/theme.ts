/**
 * The ready-made themes (spec 042, RN-01, RN-02), in the order of the editor's
 * panel. The core knows only the ids: names, groups, colors and art live in
 * the web's catalog, which a test keeps in step with this list (ADR 0021).
 * In the shared kernel because the quiz validates the choice and the game
 * copies it, and neither context imports the other. An id never changes its
 * art: new art is a new id.
 */
export const THEME_IDS = [
	"standard",
	"purple",
	"blue",
	"teal",
	"red",
	"orange",
	"graphite",
	"light",
	"light-blue",
	"light-green",
	"light-yellow",
	"light-orange",
	"lilac",
	"beige",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

/** Quizio's purple: every quiz and game from before themes (RN-04). */
export const DEFAULT_THEME_ID: ThemeId = "standard";

export function isThemeId(value: string): value is ThemeId {
	return (THEME_IDS as readonly string[]).includes(value);
}

/** Reading a stored row: an id that left the catalog reads as the default (RN-05). */
export function knownThemeId(value: string | null | undefined): ThemeId {
	return value != null && isThemeId(value) ? value : DEFAULT_THEME_ID;
}
