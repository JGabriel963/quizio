import { isLegibleColor } from "@quizio/core/shared/domain/contrast";
import { parseHexColor } from "@quizio/core/shared/domain/theme-look";
import { describe, expect, it } from "vitest";

import {
	COLOR_LIBRARY,
	DEFAULT_ACCENT_COLOR,
	DEFAULT_BACKGROUND_COLOR,
} from "./theme-palette";

describe("color library (spec 043, RN-06, RN-11)", () => {
	it("has 6 rows of 8 colors, none twice", () => {
		expect(COLOR_LIBRARY).toHaveLength(6);
		for (const row of COLOR_LIBRARY) {
			expect(row).toHaveLength(8);
		}
		expect(new Set(COLOR_LIBRARY.flat()).size).toBe(48);
	});

	it("every color is a #rrggbb code legible with light or dark text", () => {
		for (const hex of COLOR_LIBRARY.flat()) {
			expect(parseHexColor(hex)).toBe(hex);
			expect(isLegibleColor(hex)).toBe(true);
		}
	});

	it("a new theme starts with Quizio's purple behind and blue as the accent", () => {
		expect(DEFAULT_BACKGROUND_COLOR).toBe("#46178f");
		expect(DEFAULT_ACCENT_COLOR).toBe("#1368ce");
		expect(isLegibleColor(DEFAULT_BACKGROUND_COLOR)).toBe(true);
		expect(isLegibleColor(DEFAULT_ACCENT_COLOR)).toBe(true);
	});
});
