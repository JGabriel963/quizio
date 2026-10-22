import { describe, expect, it } from "vitest";

import {
	formatSliderNumber,
	sliderMarkIndexes,
	sliderPositions,
} from "./slider-format";

describe("formatSliderNumber (spec 032, RN-04)", () => {
	it("formats numbers the Brazilian way, with up to 2 decimals", () => {
		expect(formatSliderNumber(8849)).toBe("8.849");
		expect(formatSliderNumber(-100.3)).toBe("\u2212100,3");
		expect(formatSliderNumber(2000.03)).toBe("2.000,03");
		expect(formatSliderNumber(600)).toBe("600");
		expect(formatSliderNumber(0.5)).toBe("0,5");
	});

	it("rounds a margin's edge to the whole number when asked", () => {
		expect(formatSliderNumber(389.967, { whole: true })).toBe("390");
	});
});

describe("sliderPositions", () => {
	it("lists the positions from the first to the last by the step", () => {
		expect(sliderPositions({ first: 104, last: 128, step: 8 })).toEqual([
			104, 112, 120, 128,
		]);
		expect(sliderPositions({ first: 0.14, last: 2.14, step: 1 })).toEqual([
			0.14, 1.14, 2.14,
		]);
	});
});

describe("sliderMarkIndexes", () => {
	it("marks the round positions, multiples of 10 steps", () => {
		const scale = { first: 104, last: 896, step: 8 };
		const positions = sliderPositions(scale);
		const marked = [...sliderMarkIndexes(scale)].map(
			(index) => positions[index],
		);

		expect(marked).toEqual([160, 240, 320, 400, 480, 560, 640, 720, 800, 880]);
		expect(
			[...sliderMarkIndexes({ first: 460, last: 510, step: 1 })].map(
				(index) => 460 + index,
			),
		).toEqual([460, 470, 480, 490, 500, 510]);
	});

	it("falls back to every tenth position when none is round", () => {
		expect([
			...sliderMarkIndexes({ first: 0.14, last: 20.14, step: 1 }),
		]).toEqual([0, 10, 20]);
	});
});
