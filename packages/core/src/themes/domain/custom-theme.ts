import { isLegibleColor } from "../../shared/domain/contrast";
import { characterCount } from "../../shared/domain/text-length";
import type { ThemeTone } from "../../shared/domain/theme";
import {
	type HexColor,
	isBackgroundPatternId,
	parseHexColor,
	type ThemeBackground,
	type ThemeLook,
} from "../../shared/domain/theme-look";
import {
	IllegibleThemeColorError,
	InvalidThemeColorError,
	InvalidThemeNameError,
	ThemeNotFoundError,
	UnknownBackgroundPatternError,
} from "./theme-errors";

/**
 * A theme a creator made (spec 043, ADR 0022): shown only to them in "Seus
 * temas" and applied to their quizzes. Editing it changes those quizzes;
 * games keep the look they copied (RN-18, RN-24).
 */
export interface CustomTheme {
	id: string;
	ownerId: string;
	name: string;
	look: ThemeLook;
	createdAt: Date;
	updatedAt: Date;
}

export const THEME_NAME_MAX_LENGTH = 30;
export const DEFAULT_THEME_NAME = "Meu tema";

/** 1 to 30 characters, trimmed (RN-03). */
export function parseThemeName(raw: string): string {
	const name = raw.trim();
	const length = characterCount(name);
	if (length === 0 || length > THEME_NAME_MAX_LENGTH) {
		throw new InvalidThemeNameError();
	}
	return name;
}

/** What a request sends: the look before its strings are checked. */
export interface ThemeLookInput {
	background:
		| { kind: "pattern"; pattern: string; color: string }
		| { kind: "image"; key: string; tone: ThemeTone };
	accentColor: string;
	logoKey: string | null;
}

/**
 * The pattern must be one of Quizio's and both colors `#RRGGBB` codes on
 * which light or dark text reaches 4.5:1 (RN-05, RN-06, RN-11). Whether the
 * files exist is the use case's to check.
 */
export function parseThemeLookInput(input: ThemeLookInput): ThemeLook {
	return {
		background: parseBackground(input.background),
		accentColor: parseLegibleColor(input.accentColor),
		logoKey: input.logoKey,
	};
}

function parseBackground(
	background: ThemeLookInput["background"],
): ThemeBackground {
	if (background.kind === "image") {
		if (background.tone !== "dark" && background.tone !== "light") {
			throw new InvalidThemeColorError("An image background needs its tone.");
		}
		return { kind: "image", key: background.key, tone: background.tone };
	}
	if (!isBackgroundPatternId(background.pattern)) {
		throw new UnknownBackgroundPatternError();
	}
	return {
		kind: "pattern",
		pattern: background.pattern,
		color: parseLegibleColor(background.color),
	};
}

function parseLegibleColor(raw: string): HexColor {
	const color = parseHexColor(raw);
	if (!color) {
		throw new InvalidThemeColorError(`"${raw}" is not a #RRGGBB color.`);
	}
	if (!isLegibleColor(color)) {
		throw new IllegibleThemeColorError();
	}
	return color;
}

/** Someone else's theme is indistinguishable from a missing one (RN-21). */
export function requireOwnedTheme(
	theme: CustomTheme | null,
	ownerId: string,
): CustomTheme {
	if (!theme || theme.ownerId !== ownerId) {
		throw new ThemeNotFoundError();
	}
	return theme;
}
