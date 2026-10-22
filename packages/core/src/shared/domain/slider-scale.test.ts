import { describe, expect, it } from "vitest";
import {
	firstPosition,
	isSliderPosition,
	lastPosition,
	marginRange,
	type SliderScale,
	sliderCorrectness,
	sliderPrecision,
	sliderStep,
	startPosition,
} from "./slider-scale";

function scale(overrides: Partial<SliderScale> = {}): SliderScale {
	return { min: 100, max: 900, answer: 600, margin: "medium", ...overrides };
}

describe("sliderStep", () => {
	it("the step is the range over 100 rounded up at its first digit, at least 1", () => {
		expect(sliderStep(590, 640)).toBe(1);
		expect(sliderStep(0, 50)).toBe(1);
		expect(sliderStep(100, 640)).toBe(6);
		expect(sliderStep(100, 900)).toBe(8);
		expect(sliderStep(-100.3, 2000.03)).toBe(30);
		expect(sliderStep(0, 950)).toBe(10);
		expect(sliderStep(0, 100_000)).toBe(1000);
		expect(sliderStep(0, 100_001)).toBe(2000);
	});
});

describe("positions", () => {
	it("positions count from the answer within the range", () => {
		expect(firstPosition(scale())).toBe(104);
		expect(lastPosition(scale())).toBe(896);
		const narrow = scale({ max: 640 });
		expect(firstPosition(narrow)).toBe(102);
		expect(lastPosition(narrow)).toBe(636);
		expect(isSliderPosition(narrow, 600)).toBe(true);
		expect(isSliderPosition(narrow, 606)).toBe(true);
		expect(isSliderPosition(narrow, 601)).toBe(false);
	});

	it("the min and the max are positions only when they fall on a step", () => {
		expect(isSliderPosition(scale(), 100)).toBe(false);
		expect(isSliderPosition(scale(), 900)).toBe(false);
		const onSteps = scale({ min: 0, max: 800, answer: 600 });
		expect(isSliderPosition(onSteps, 0)).toBe(true);
		expect(isSliderPosition(onSteps, 800)).toBe(true);
		expect(isSliderPosition(onSteps, 808)).toBe(false);
	});

	it("decimal answers keep their decimals in every position", () => {
		const decimal = scale({ min: 0, max: 5, answer: 3.14 });
		expect(firstPosition(decimal)).toBe(0.14);
		expect(lastPosition(decimal)).toBe(4.14);
		expect(isSliderPosition(decimal, 2.14)).toBe(true);
		expect(isSliderPosition(decimal, 2.15)).toBe(false);
		expect(isSliderPosition(decimal, 2.141)).toBe(false);
		expect(isSliderPosition(decimal, Number.NaN)).toBe(false);
	});

	it("the start is the position closest to the middle, the lower one on a tie", () => {
		expect(startPosition(scale())).toBe(496);
		expect(startPosition(scale({ min: 0, max: 50, answer: 25 }))).toBe(25);
		expect(startPosition(scale({ min: 0, max: 50, answer: 0 }))).toBe(25);
		expect(startPosition(scale({ min: 0, max: 10, answer: 0.5 }))).toBe(4.5);
	});
});

describe("marginRange", () => {
	it("margin ranges of each level are clipped by the range", () => {
		expect(marginRange(scale({ margin: "none" }))).toEqual({
			low: 600,
			high: 600,
		});
		expect(marginRange(scale({ margin: "low" }))).toEqual({
			low: 560,
			high: 640,
		});
		expect(marginRange(scale())).toEqual({ low: 520, high: 680 });
		expect(marginRange(scale({ margin: "high" }))).toEqual({
			low: 440,
			high: 760,
		});
		expect(marginRange(scale({ max: 640 }))).toEqual({ low: 546, high: 640 });
		expect(marginRange(scale({ min: 590, max: 640 }))).toEqual({
			low: 595,
			high: 605,
		});
	});

	it("the margin keeps the decimals of the range", () => {
		const range = marginRange(scale({ min: -100.3, max: 2000.03 }));
		expect(range.low).toBeCloseTo(389.967, 6);
		expect(range.high).toBeCloseTo(810.033, 6);
	});

	it("the maximum margin reaches the far end", () => {
		expect(marginRange(scale({ margin: "maximum" }))).toEqual({
			low: 100,
			high: 900,
		});
	});
});

describe("sliderCorrectness", () => {
	it("equal to the answer is correct", () => {
		expect(sliderCorrectness(scale(), 600)).toBe("correct");
	});

	it("within the margin is almost correct, its edge included", () => {
		expect(sliderCorrectness(scale(), 680)).toBe("almostCorrect");
		expect(sliderCorrectness(scale(), 520)).toBe("almostCorrect");
		expect(sliderCorrectness(scale(), 604)).toBe("almostCorrect");
	});

	it("past the margin is wrong", () => {
		expect(sliderCorrectness(scale(), 688)).toBe("wrong");
		expect(sliderCorrectness(scale(), 512)).toBe("wrong");
	});

	it("with no margin only the answer is right", () => {
		expect(sliderCorrectness(scale({ margin: "none" }), 600)).toBe("correct");
		expect(sliderCorrectness(scale({ margin: "none" }), 608)).toBe("wrong");
	});
});

describe("sliderPrecision", () => {
	it("precision is 1 at the answer and 0 at the margin's edge", () => {
		expect(sliderPrecision(scale(), 600)).toBe(1);
		expect(sliderPrecision(scale(), 640)).toBe(0.5);
		expect(sliderPrecision(scale(), 680)).toBe(0);
		expect(sliderPrecision(scale(), 760)).toBe(0);
		expect(sliderPrecision(scale({ margin: "none" }), 600)).toBe(1);
		expect(sliderPrecision(scale({ margin: "none" }), 608)).toBe(0);
	});

	it("with the maximum margin the far end is almost correct with precision 0", () => {
		const maximum = scale({ margin: "maximum" });
		expect(sliderCorrectness(maximum, 104)).toBe("almostCorrect");
		expect(sliderPrecision(maximum, 100)).toBe(0);
		expect(sliderPrecision(maximum, 850)).toBeCloseTo(0.5, 10);
	});
});
