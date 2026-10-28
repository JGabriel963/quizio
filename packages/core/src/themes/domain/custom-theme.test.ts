import { describe, expect, it } from "vitest";

import { aCustomTheme } from "../testing/a-custom-theme";
import {
	parseThemeLookInput,
	parseThemeName,
	requireOwnedTheme,
	THEME_NAME_MAX_LENGTH,
} from "./custom-theme";
import {
	IllegibleThemeColorError,
	InvalidThemeColorError,
	InvalidThemeNameError,
	ThemeNotFoundError,
	UnknownBackgroundPatternError,
} from "./theme-errors";

describe("parseThemeName (spec 043, RN-03)", () => {
	it("a name has 1 to 30 characters, trimmed", () => {
		expect(parseThemeName("  Escola Azul ")).toBe("Escola Azul");
		expect(parseThemeName("a".repeat(THEME_NAME_MAX_LENGTH))).toHaveLength(30);
	});

	it("refuses an empty name or one of 31 characters", () => {
		expect(() => parseThemeName("   ")).toThrow(InvalidThemeNameError);
		expect(() => parseThemeName("a".repeat(31))).toThrow(InvalidThemeNameError);
	});
});

describe("parseThemeLookInput (spec 043, RN-04 to RN-06, RN-11)", () => {
	it("takes a pattern look, colors in lower case", () => {
		expect(
			parseThemeLookInput({
				background: { kind: "pattern", pattern: "peaks", color: "#1B2A6B" },
				accentColor: "#FFD84D",
				logoKey: null,
			}),
		).toEqual({
			background: { kind: "pattern", pattern: "peaks", color: "#1b2a6b" },
			accentColor: "#ffd84d",
			logoKey: null,
		});
	});

	it("takes an image look with its tone", () => {
		const look = parseThemeLookInput({
			background: { kind: "image", key: "themes/u1/a.jpg", tone: "light" },
			accentColor: "#1368ce",
			logoKey: "themes/u1/b.png",
		});

		expect(look.background).toEqual({
			kind: "image",
			key: "themes/u1/a.jpg",
			tone: "light",
		});
	});

	it("refuses an unknown pattern", () => {
		expect(() =>
			parseThemeLookInput({
				background: { kind: "pattern", pattern: "stars", color: "#1b2a6b" },
				accentColor: "#ffd84d",
				logoKey: null,
			}),
		).toThrow(UnknownBackgroundPatternError);
	});

	it("refuses a malformed color", () => {
		expect(() =>
			parseThemeLookInput({
				background: { kind: "pattern", pattern: "waves", color: "azul" },
				accentColor: "#ffd84d",
				logoKey: null,
			}),
		).toThrow(InvalidThemeColorError);
	});

	it("refuses an illegible background or accent color", () => {
		expect(() =>
			parseThemeLookInput({
				background: { kind: "pattern", pattern: "waves", color: "#777777" },
				accentColor: "#ffd84d",
				logoKey: null,
			}),
		).toThrow(IllegibleThemeColorError);
		expect(() =>
			parseThemeLookInput({
				background: { kind: "pattern", pattern: "waves", color: "#1b2a6b" },
				accentColor: "#777777",
				logoKey: null,
			}),
		).toThrow(IllegibleThemeColorError);
	});

	it("an image background needs its tone", () => {
		expect(() =>
			parseThemeLookInput({
				background: {
					kind: "image",
					key: "themes/u1/a.jpg",
					tone: "grey" as "light",
				},
				accentColor: "#1368ce",
				logoKey: null,
			}),
		).toThrow(InvalidThemeColorError);
	});
});

describe("requireOwnedTheme (spec 043, RN-21)", () => {
	it("gives the owner's theme back", () => {
		const theme = aCustomTheme({ ownerId: "u1" });

		expect(requireOwnedTheme(theme, "u1")).toBe(theme);
	});

	it("hides someone else's theme as not found", () => {
		expect(() =>
			requireOwnedTheme(aCustomTheme({ ownerId: "u1" }), "u2"),
		).toThrow(ThemeNotFoundError);
		expect(() => requireOwnedTheme(null, "u1")).toThrow(ThemeNotFoundError);
	});
});
