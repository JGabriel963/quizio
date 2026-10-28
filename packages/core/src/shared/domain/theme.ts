import { NotFoundError } from "./not-found-error";

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

/**
 * Whether a theme is dark or light: on a light one the text over the
 * background is dark (spec 042, RN-21).
 */
export type ThemeTone = "dark" | "light";

/** Quizio's purple: every quiz and game from before themes (RN-04). */
export const DEFAULT_THEME_ID: ThemeId = "standard";

export function isThemeId(value: string): value is ThemeId {
	return (THEME_IDS as readonly string[]).includes(value);
}

/** Reading a stored row: an id that left the catalog reads as the default (RN-05). */
export function knownThemeId(value: string | null | undefined): ThemeId {
	return value != null && isThemeId(value) ? value : DEFAULT_THEME_ID;
}

/**
 * A custom theme that is missing, deleted or someone else's: the same answer
 * (spec 043, RN-20, RN-21). Here because the quiz refuses it when applying a
 * theme and the themes context when editing one.
 */
export class ThemeNotFoundError extends NotFoundError {
	readonly code = "THEME.NOT_FOUND";
	constructor() {
		super("Theme not found.");
	}
}
