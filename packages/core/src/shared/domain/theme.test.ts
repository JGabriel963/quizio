import { describe, expect, it } from "vitest";

import { DEFAULT_THEME_ID, isThemeId, knownThemeId, THEME_IDS } from "./theme";

describe("THEME_IDS", () => {
	it("has 14 themes without repeats, standard first", () => {
		expect(THEME_IDS).toHaveLength(14);
		expect(new Set(THEME_IDS).size).toBe(14);
		expect(THEME_IDS[0]).toBe("standard");
		expect(DEFAULT_THEME_ID).toBe("standard");
	});
});

describe("isThemeId", () => {
	it("accepts only catalog ids", () => {
		expect(isThemeId("light-blue")).toBe(true);
		expect(isThemeId("winter-games")).toBe(false);
		expect(isThemeId("")).toBe(false);
	});
});

describe("knownThemeId", () => {
	it("reads an id that left the catalog as standard", () => {
		expect(knownThemeId("autumn")).toBe("standard");
		expect(knownThemeId("teal")).toBe("teal");
	});

	it("reads null as standard", () => {
		expect(knownThemeId(null)).toBe("standard");
		expect(knownThemeId(undefined)).toBe("standard");
	});
});
