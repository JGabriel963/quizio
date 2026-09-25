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
	])("falls back to the home for %s", (target) => {
		expect(safeRedirect(target)).toBe(DEFAULT_REDIRECT);
	});

	it("falls back to the home when no destination is given", () => {
		// Spec 002, RN-02: signing in without a requested page lands on the dashboard.
		expect(DEFAULT_REDIRECT).toBe("/");
	});
});
