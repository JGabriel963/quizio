import { describe, expect, it } from "vitest";

import { scatterTags, tagColorAt } from "./typed-answers-reveal";

describe("scatterTags (spec 031, RN-23)", () => {
	it("scatters tags the same way for the same question", () => {
		expect(scatterTags(7, "game-1:0")).toEqual(scatterTags(7, "game-1:0"));
		expect(scatterTags(7, "game-1:0")).not.toEqual(scatterTags(7, "game-1:1"));
	});

	it("keeps every tag inside the area, slightly tilted", () => {
		for (const tag of scatterTags(12, "seed")) {
			expect(tag.x).toBeGreaterThanOrEqual(0);
			expect(tag.x).toBeLessThan(100);
			expect(tag.y).toBeGreaterThanOrEqual(0);
			expect(tag.y).toBeLessThan(100);
			expect(Math.abs(tag.rotate)).toBeLessThanOrEqual(4);
		}
	});

	it("colors the tags in turn", () => {
		expect([0, 1, 2, 3, 4].map(tagColorAt)).toEqual([
			"bg-answer-red",
			"bg-answer-blue",
			"bg-answer-yellow",
			"bg-answer-green",
			"bg-answer-red",
		]);
	});
});
