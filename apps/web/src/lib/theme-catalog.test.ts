import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { THEME_IDS } from "@quizio/core/shared/domain/theme";
import { describe, expect, it } from "vitest";

import { DARK_TEXT, LIGHT_TEXT, worstContrast } from "./contrast";
import {
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
