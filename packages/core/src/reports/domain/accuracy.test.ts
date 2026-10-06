import { describe, expect, it } from "vitest";

import {
	accuracyPercent,
	compareAccuracy,
	isLowAccuracy,
	LOW_ACCURACY_PERCENT,
} from "./accuracy";

describe("accuracy (spec 015)", () => {
	it("rounds to the nearest integer", () => {
		expect(accuracyPercent({ correct: 4, total: 8 })).toBe(50);
		expect(accuracyPercent({ correct: 1, total: 3 })).toBe(33);
		expect(accuracyPercent({ correct: 2, total: 3 })).toBe(67);
		expect(accuracyPercent({ correct: 0, total: 5 })).toBe(0);
		expect(accuracyPercent({ correct: 5, total: 5 })).toBe(100);
	});

	it("has no percent without a total", () => {
		expect(accuracyPercent({ correct: 0, total: 0 })).toBeNull();
		expect(isLowAccuracy({ correct: 0, total: 0 })).toBe(false);
	});

	it("is low below 35%, not at 35%", () => {
		expect(isLowAccuracy({ correct: 6, total: 20 })).toBe(true);
		expect(isLowAccuracy({ correct: 7, total: 20 })).toBe(false);
		expect(isLowAccuracy({ correct: 8, total: 20 })).toBe(false);
		expect(LOW_ACCURACY_PERCENT).toBe(35);
	});

	it("compares the exact value, not the rounded one", () => {
		// 34.6% shows as 35% and is still low.
		const almost = { correct: 9, total: 26 };

		expect(accuracyPercent(almost)).toBe(35);
		expect(isLowAccuracy(almost)).toBe(true);
	});

	it("orders from the lowest to the highest", () => {
		expect(
			compareAccuracy({ correct: 1, total: 4 }, { correct: 1, total: 3 }),
		).toBeLessThan(0);
		expect(
			compareAccuracy({ correct: 2, total: 4 }, { correct: 1, total: 2 }),
		).toBe(0);
	});
});
