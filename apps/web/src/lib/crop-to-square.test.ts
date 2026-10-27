import { describe, expect, it } from "vitest";

import { squareSourceOf } from "./crop-to-square";

describe("squareSourceOf (spec 039, RN-09)", () => {
	it("at zoom 1 and centered, the largest centered square", () => {
		expect(
			squareSourceOf(
				{ width: 1000, height: 500 },
				{ shape: "circle", zoom: 1, x: 0.5, y: 0.5 },
			),
		).toEqual({ x: 250, y: 0, size: 500 });
	});

	it("zoom narrows the square, x and y move it along the free travel", () => {
		expect(
			squareSourceOf(
				{ width: 1000, height: 500 },
				{ shape: "circle", zoom: 2, x: 0, y: 1 },
			),
		).toEqual({ x: 0, y: 250, size: 250 });
	});
});
