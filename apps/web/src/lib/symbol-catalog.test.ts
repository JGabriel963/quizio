import { characterCount } from "@quizio/core/shared/domain/text-length";
import coverage from "@quizio/ui/fonts/quizio-symbols.coverage.json";
import { describe, expect, it } from "vitest";

import { SYMBOL_TABS } from "./symbol-catalog";

describe("symbol catalog (spec 047, RN-11, RN-15)", () => {
	it("has the five tabs in order, Caracteres especiais first", () => {
		expect(SYMBOL_TABS.map((tab) => tab.label)).toEqual([
			"Caracteres especiais",
			"Moeda",
			"Matemática",
			"Grego",
			"Outro",
		]);
	});

	it("Grego has 24 capitals and 25 small letters with σ and ς", () => {
		const greek = SYMBOL_TABS.find((tab) => tab.id === "greek")?.symbols ?? [];
		const capitals = greek.filter((symbol) => symbol !== symbol.toLowerCase());

		expect(capitals).toHaveLength(24);
		expect(greek).toHaveLength(49);
		expect(greek).toContain("σ");
		expect(greek).toContain("ς");
		expect(greek.at(0)).toBe("Α");
		expect(greek.at(-1)).toBe("ω");
	});

	it("each symbol is one grapheme and appears once in its tab", () => {
		for (const tab of SYMBOL_TABS) {
			expect(new Set(tab.symbols).size).toBe(tab.symbols.length);
			for (const symbol of tab.symbols) {
				expect(characterCount(symbol)).toBe(1);
			}
		}
	});

	it("every symbol is covered by Montserrat or Quizio Symbols (RN-16)", () => {
		const covered = new Set(coverage.codePoints);

		const missing = SYMBOL_TABS.flatMap((tab) => tab.symbols).filter((symbol) =>
			[...symbol].some((char) => !covered.has(char.codePointAt(0) ?? -1)),
		);

		expect(missing).toEqual([]);
	});

	it("Caracteres especiais starts at À and Moeda has the 28 of the captures it can draw", () => {
		const [special, currency] = SYMBOL_TABS;

		expect(special?.symbols.slice(0, 3)).toEqual(["À", "Á", "Â"]);
		expect(currency?.symbols).toHaveLength(28);
		expect(currency?.symbols.slice(0, 3)).toEqual(["$", "£", "€"]);
	});
});
