import { describe, expect, it } from "vitest";

import {
	BACKGROUND_PATTERN_IDS,
	isBackgroundPatternId,
	parseHexColor,
	readThemeLook,
	type ThemeLook,
	themeLookFileKeys,
} from "./theme-look";

const patternLook: ThemeLook = {
	background: { kind: "pattern", pattern: "waves", color: "#1b2a6b" },
	accentColor: "#ffd84d",
	logoKey: null,
};

const imageLook: ThemeLook = {
	background: { kind: "image", key: "themes/u1/bg.jpg", tone: "dark" },
	accentColor: "#1368ce",
	logoKey: "themes/u1/logo.png",
};

describe("parseHexColor (spec 043, RN-06)", () => {
	it("takes #RRGGBB and stores it in lower case", () => {
		expect(parseHexColor("#1B2A6B")).toBe("#1b2a6b");
		expect(parseHexColor("  #ffd84d ")).toBe("#ffd84d");
	});

	it("refuses #12345, names and a missing #", () => {
		expect(parseHexColor("#12345")).toBeNull();
		expect(parseHexColor("azul")).toBeNull();
		expect(parseHexColor("1b2a6b")).toBeNull();
		expect(parseHexColor("#12345g")).toBeNull();
	});
});

describe("background patterns (spec 043, RN-05)", () => {
	it("there are 4", () => {
		expect(BACKGROUND_PATTERN_IDS).toHaveLength(4);
		expect(isBackgroundPatternId("waves")).toBe(true);
		expect(isBackgroundPatternId("stars")).toBe(false);
	});
});

describe("themeLookFileKeys (spec 043, RN-28)", () => {
	it("lists the image and the logo", () => {
		expect(themeLookFileKeys(imageLook)).toEqual([
			"themes/u1/bg.jpg",
			"themes/u1/logo.png",
		]);
		expect(themeLookFileKeys(patternLook)).toEqual([]);
	});
});

describe("readThemeLook", () => {
	it("reads a stored look", () => {
		expect(readThemeLook(JSON.parse(JSON.stringify(patternLook)))).toEqual(
			patternLook,
		);
		expect(readThemeLook(JSON.parse(JSON.stringify(imageLook)))).toEqual(
			imageLook,
		);
	});

	it("gives null for nothing, an unknown shape or an unknown pattern", () => {
		expect(readThemeLook(null)).toBeNull();
		expect(readThemeLook({ accentColor: "#ffffff" })).toBeNull();
		expect(
			readThemeLook({
				...patternLook,
				background: { kind: "pattern", pattern: "stars", color: "#000000" },
			}),
		).toBeNull();
		expect(readThemeLook({ ...patternLook, accentColor: "yellow" })).toBeNull();
	});
});
