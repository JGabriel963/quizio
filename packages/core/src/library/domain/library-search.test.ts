import { describe, expect, it } from "vitest";

import { parseLibrarySearch } from "./library-search";
import { LIBRARY_SECTIONS } from "./library-section";

describe("library search", () => {
	it("returns null for blank searches and normalized text otherwise", () => {
		expect(parseLibrarySearch(undefined)).toBeNull();
		expect(parseLibrarySearch("   ")).toBeNull();
		expect(parseLibrarySearch("  Bíblia ")).toBe("biblia");
	});

	it("lists the recent, drafts and trash sections", () => {
		expect(LIBRARY_SECTIONS).toEqual(["recent", "drafts", "trash"]);
	});
});
