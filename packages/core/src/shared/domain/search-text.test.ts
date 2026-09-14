import { describe, expect, it } from "vitest";

import { normalizeSearchText } from "./search-text";

describe("normalizeSearchText", () => {
	it("strips accents, lowercases and collapses whitespace", () => {
		expect(normalizeSearchText("  Bom de  BÍBLIA\t(Junho) ")).toBe(
			"bom de biblia (junho)",
		);
		expect(normalizeSearchText("Ação, Çedilha e São Tomé")).toBe(
			"acao, cedilha e sao tome",
		);
	});

	it("returns an empty string for blank text", () => {
		expect(normalizeSearchText("   ")).toBe("");
	});
});
