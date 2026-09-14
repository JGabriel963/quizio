import { describe, expect, it } from "vitest";

import { characterCount, truncateCharacters } from "./text-length";

describe("characterCount", () => {
	it("counts plain text by character", () => {
		expect(characterCount("Quizio")).toBe(6);
		expect(characterCount("")).toBe(0);
	});

	it("counts emoji and composed accents as one character", () => {
		const precomposedE = "é";
		const decomposedE = "é";
		const familyEmoji = "\u{1F468}‍\u{1F469}‍\u{1F467}";

		expect(characterCount("\u{1F389}")).toBe(1);
		expect(characterCount(familyEmoji)).toBe(1);
		expect(characterCount(precomposedE)).toBe(1);
		expect(characterCount(decomposedE)).toBe(1);
	});
});

describe("truncateCharacters", () => {
	it("keeps whole characters up to the limit", () => {
		expect(truncateCharacters("Quizio", 4)).toBe("Quiz");
		expect(truncateCharacters("ab\u{1F389}cd", 3)).toBe("ab\u{1F389}");
		expect(truncateCharacters("curto", 10)).toBe("curto");
	});
});
