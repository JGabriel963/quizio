import { describe, expect, it } from "vitest";

import { DEFAULT_REDIRECT, safeRedirect } from "./safe-redirect";

describe("safeRedirect", () => {
	it("accepts internal paths with search and hash", () => {
		expect(safeRedirect("/quizzes/abc?from=library#top")).toBe(
			"/quizzes/abc?from=library#top",
		);
	});

	it.each([
		undefined,
		null,
		"",
		"library",
		"https://evil.example/login",
		"//evil.example",
		"/\\evil.example",
		"javascript:alert(1)",
	])("falls back to the library for %s", (target) => {
		expect(safeRedirect(target)).toBe(DEFAULT_REDIRECT);
	});

	it("uses /library as the default destination", () => {
		expect(DEFAULT_REDIRECT).toBe("/library");
	});
});
