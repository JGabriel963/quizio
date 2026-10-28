import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
	DARK_TEXT,
	LIGHT_TEXT,
	worstContrast,
} from "@quizio/core/shared/domain/contrast";
import { THEME_IDS } from "@quizio/core/shared/domain/theme";
import { BACKGROUND_PATTERN_IDS } from "@quizio/core/shared/domain/theme-look";
import { describe, expect, it } from "vitest";
import {
	shownTheme,
	THEME_CATALOG,
	THEME_GROUPS,
	themeOf,
	themeStyle,
	themeTone,
} from "./theme-catalog";

const publicDir = resolve(import.meta.dirname, "../../public");

describe("theme catalog (spec 042)", () => {
	it("has exactly the core's theme ids", () => {
		expect(Object.keys(THEME_CATALOG).sort()).toEqual([...THEME_IDS].sort());
		expect(THEME_GROUPS.flatMap((group) => group.themeIds)).toEqual([
			...THEME_IDS,
		]);
	});

	it("the groups are Padrão, Cores and Claros with 1, 6 and 7 themes", () => {
		expect(
			THEME_GROUPS.map((group) => [group.name, group.themeIds.length]),
		).toEqual([
			["Padrão", 1],
			["Cores", 6],
			["Claros", 7],
		]);
	});

	it("every theme has a name and its file in public/themes", () => {
		for (const id of THEME_IDS) {
			const theme = THEME_CATALOG[id];
			expect(theme.name.length).toBeGreaterThan(0);
			expect(theme.image).toBe(`/themes/${id}.svg`);
			expect(existsSync(`${publicDir}${theme.image}`)).toBe(true);
		}
	});

	it("every theme reaches 4.5:1 on its background colors and on its accent (RN-20)", () => {
		for (const id of THEME_IDS) {
			const theme = themeOf(id);
			expect(
				worstContrast(theme.text, theme.surfaces),
				id,
			).toBeGreaterThanOrEqual(4.5);
			expect(
				worstContrast(theme.accentText, [theme.accent]),
				id,
			).toBeGreaterThanOrEqual(4.5);
		}
	});

	it("the Claros themes are light and the others dark (RN-21)", () => {
		const [standard, colors, lights] = THEME_GROUPS;
		for (const id of [
			...(standard?.themeIds ?? []),
			...(colors?.themeIds ?? []),
		]) {
			expect(themeTone(id), id).toBe("dark");
			expect(themeOf(id).text).toBe(LIGHT_TEXT);
		}
		for (const id of lights?.themeIds ?? []) {
			expect(themeTone(id), id).toBe("light");
			expect(themeOf(id).text).toBe(DARK_TEXT);
		}
	});

	it("gives the screens the theme as CSS variables", () => {
		expect(themeStyle("light-blue")).toMatchObject({
			"--game-bg-image": 'url("/themes/light-blue.svg")',
			"--game-fg": DARK_TEXT,
		});
		expect(themeStyle("standard")).toMatchObject({ "--game-fg": LIGHT_TEXT });
	});

	it("chips on the background are dark with white text on dark themes and light with dark text on light ones", () => {
		expect(themeStyle("teal")).toMatchObject({
			"--game-chip": "rgb(0 0 0 / 0.4)",
			"--game-chip-fg": LIGHT_TEXT,
		});
		expect(themeStyle("beige")).toMatchObject({
			"--game-chip": "rgb(255 255 255 / 0.75)",
			"--game-chip-fg": DARK_TEXT,
		});
	});

	it("the bars stay dark on every theme, dark enough for white text", () => {
		expect(themeStyle("standard")).toMatchObject({
			"--game-bar": "rgb(0 0 0 / 0.4)",
		});
		expect(themeStyle("light")).toMatchObject({
			"--game-bar": "rgb(23 23 23 / 0.8)",
		});
	});
});

describe("custom looks (spec 043)", () => {
	const patternLook = {
		pattern: "peaks" as const,
		backgroundColor: "#1b2a6b",
		imageUrl: null,
		imageTone: null,
		accentColor: "#ffd84d",
		logoUrl: null,
	};

	it("every pattern has its art in public/themes/patterns (RN-05)", () => {
		for (const id of BACKGROUND_PATTERN_IDS) {
			expect(existsSync(resolve(publicDir, `themes/patterns/${id}.svg`))).toBe(
				true,
			);
		}
	});

	it("a pattern look gives the color base, the pattern art and readable text", () => {
		expect(themeStyle(shownTheme("standard", patternLook))).toMatchObject({
			"--game-base": "#1b2a6b",
			"--game-bg-image": 'url("/themes/patterns/peaks.svg")',
			"--game-fg": LIGHT_TEXT,
			"--game-accent": "#ffd84d",
			"--game-accent-fg": DARK_TEXT,
			"--game-chip": "rgb(0 0 0 / 0.4)",
		});
		expect(
			themeStyle(
				shownTheme("standard", { ...patternLook, backgroundColor: "#f5e9c8" }),
			),
		).toMatchObject({
			"--game-fg": DARK_TEXT,
			"--game-chip": "rgb(255 255 255 / 0.75)",
		});
	});

	it("an image look puts the image behind and takes its tone (RN-12)", () => {
		const style = themeStyle(
			shownTheme("standard", {
				...patternLook,
				pattern: null,
				backgroundColor: null,
				imageUrl: "https://media.test/themes/u1/bg.jpg",
				imageTone: "dark",
			}),
		);

		expect(style).toMatchObject({
			"--game-bg-image": 'url("https://media.test/themes/u1/bg.jpg")',
			"--game-fg": LIGHT_TEXT,
			"--game-chip-fg": LIGHT_TEXT,
		});
	});

	it("a light image gives light strips with dark text (RN-12, CA-11)", () => {
		expect(
			themeStyle(
				shownTheme("standard", {
					...patternLook,
					pattern: null,
					backgroundColor: null,
					imageUrl: "https://media.test/themes/u1/white.jpg",
					imageTone: "light",
				}),
			),
		).toMatchObject({
			"--game-fg": DARK_TEXT,
			"--game-chip": "rgb(255 255 255 / 0.75)",
			"--game-chip-fg": DARK_TEXT,
			"--game-bar": "rgb(23 23 23 / 0.8)",
		});
	});

	it("a catalog theme is unchanged", () => {
		expect(themeStyle(shownTheme("teal", null))).toEqual(themeStyle("teal"));
	});
});
