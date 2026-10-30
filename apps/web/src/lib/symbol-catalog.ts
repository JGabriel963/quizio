import catalog from "./symbol-catalog.json";

/**
 * The tabs of "Insira um símbolo" (spec 047, RN-11, RN-15), from Kahoot's
 * captures. The lists live in the JSON beside this file because the script
 * that cuts the symbol font (`packages/ui/scripts/build-symbol-font.py`)
 * reads them too: a symbol added here needs the font built again, or the
 * catalog's coverage test fails (RN-16).
 */
export interface SymbolTab {
	id: "special" | "currency" | "math" | "greek" | "other";
	label: string;
	/** One grapheme each, in the order the grid shows them. */
	symbols: readonly string[];
}

export const SYMBOL_TABS = catalog.tabs as readonly SymbolTab[];
