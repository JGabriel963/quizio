import type { ThemeTone } from "./theme";

/**
 * What a custom theme looks like (spec 043, ADR 0022): the background, the
 * accent color and the logo. In the shared kernel because `themes` makes it,
 * the game copies it when created and the views draw it. Files are keys,
 * never URLs (ADR 0003).
 */

/** Quizio's own background patterns (RN-05); the art lives in the web. */
export const BACKGROUND_PATTERN_IDS = [
	"waves",
	"peaks",
	"rings",
	"tiles",
] as const;

export type BackgroundPatternId = (typeof BACKGROUND_PATTERN_IDS)[number];

/** `#rrggbb`, always in lower case. */
export type HexColor = string;

export type ThemeBackground =
	| { kind: "pattern"; pattern: BackgroundPatternId; color: HexColor }
	| { kind: "image"; key: string; tone: ThemeTone };

export interface ThemeLook {
	background: ThemeBackground;
	accentColor: HexColor;
	logoKey: string | null;
}

const HEX_COLOR = /^#[0-9a-f]{6}$/;

/** A typed color code (RN-06): `#RRGGBB`, or null. */
export function parseHexColor(text: string): HexColor | null {
	const color = text.trim().toLowerCase();
	return HEX_COLOR.test(color) ? color : null;
}

export function isBackgroundPatternId(
	value: unknown,
): value is BackgroundPatternId {
	return (BACKGROUND_PATTERN_IDS as readonly unknown[]).includes(value);
}

/** The files a look uses: the background image and the logo (RN-28). */
export function themeLookFileKeys(look: ThemeLook): string[] {
	return [
		...(look.background.kind === "image" ? [look.background.key] : []),
		...(look.logoKey ? [look.logoKey] : []),
	];
}

/**
 * Reading a stored look: anything it does not recognise reads as no look,
 * and the screens fall back to the theme id, as a ready-made theme that left
 * the catalog does (spec 042, RN-05).
 */
export function readThemeLook(value: unknown): ThemeLook | null {
	if (!isRecord(value)) {
		return null;
	}
	const background = readBackground(value.background);
	const accentColor = readColor(value.accentColor);
	const logoKey = value.logoKey ?? null;
	if (
		!background ||
		!accentColor ||
		(logoKey !== null && typeof logoKey !== "string")
	) {
		return null;
	}
	return { background, accentColor, logoKey };
}

function readBackground(value: unknown): ThemeBackground | null {
	if (!isRecord(value)) {
		return null;
	}
	if (value.kind === "pattern") {
		const color = readColor(value.color);
		return isBackgroundPatternId(value.pattern) && color
			? { kind: "pattern", pattern: value.pattern, color }
			: null;
	}
	if (value.kind === "image") {
		return typeof value.key === "string" &&
			(value.tone === "dark" || value.tone === "light")
			? { kind: "image", key: value.key, tone: value.tone }
			: null;
	}
	return null;
}

function readColor(value: unknown): HexColor | null {
	return typeof value === "string" ? parseHexColor(value) : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
