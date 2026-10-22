import { describe, expect, it } from "vitest";

import { aSliderGameQuestion } from "../testing/a-game-question";
import { sliderResultsOf } from "./slider-results";

describe("sliderResultsOf (spec 032, RN-31)", () => {
	const slider = aSliderGameQuestion().slider;
	if (slider === null) {
		throw new Error("The builder makes a slider");
	}

	it("counts the answers per position, by value, with the margin range", () => {
		expect(
			sliderResultsOf(slider, [
				{ value: 640 },
				{ value: 600 },
				{ value: 640 },
				{ value: 104 },
				{ value: null },
			]),
		).toEqual({
			answer: 600,
			low: 520,
			high: 680,
			unit: "anos",
			counts: [
				{ value: 104, count: 1 },
				{ value: 600, count: 1 },
				{ value: 640, count: 2 },
			],
		});
	});

	it("has no counts without answers", () => {
		expect(sliderResultsOf(slider, []).counts).toEqual([]);
	});
});
