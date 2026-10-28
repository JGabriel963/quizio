import { describe, expect, it } from "vitest";

import {
	contrastRatio,
	DARK_TEXT,
	isLegibleColor,
	LIGHT_TEXT,
	readableTextOn,
	relativeLuminance,
} from "./contrast";

describe("contrastRatio (WCAG 2.2)", () => {
	it("white on black has a ratio of 21", () => {
		expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
		expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
		expect(relativeLuminance("#000000")).toBe(0);
	});

	it("equal colors have a ratio of 1", () => {
		expect(contrastRatio("#46178f", "#46178f")).toBe(1);
	});

	it("does not depend on the order of the colors", () => {
		expect(contrastRatio("#1368ce", "#ffffff")).toBeCloseTo(
			contrastRatio("#ffffff", "#1368ce"),
			10,
		);
	});
});

describe("readableTextOn (spec 042, RN-19)", () => {
	it("picks dark text on a light color", () => {
		expect(readableTextOn(["#f2f2f2"])).toBe(DARK_TEXT);
	});

	it("picks light text on a dark color", () => {
		expect(readableTextOn(["#46178f"])).toBe(LIGHT_TEXT);
	});

	it("picks the text with the best minimum ratio over several colors", () => {
		// White beats dark text on the purple, though dark wins on the yellow.
		const colors = ["#46178f", "#25076b", "#ffd84d"];

		const text = readableTextOn(colors);

		const worst = (candidate: string) =>
			Math.min(...colors.map((color) => contrastRatio(candidate, color)));
		const other = text === LIGHT_TEXT ? DARK_TEXT : LIGHT_TEXT;
		expect(worst(text)).toBeGreaterThan(worst(other));
	});
});

describe("isLegibleColor (spec 043, RN-11)", () => {
	it("is true when light or dark text reaches 4.5:1", () => {
		expect(isLegibleColor("#46178f")).toBe(true);
		expect(isLegibleColor("#ffd84d")).toBe(true);
		expect(isLegibleColor("#ffffff")).toBe(true);
	});

	it("a mid color that neither text reaches 4.5:1 on is not legible", () => {
		// Light text gets about 3.6:1 and dark text about 4.4:1 here.
		expect(contrastRatio(LIGHT_TEXT, "#777777")).toBeLessThan(4.5);
		expect(contrastRatio(DARK_TEXT, "#777777")).toBeLessThan(4.5);
		expect(isLegibleColor("#777777")).toBe(false);
	});
});
