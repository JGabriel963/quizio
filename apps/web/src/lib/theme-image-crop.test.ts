import { describe, expect, it } from "vitest";

import {
	frameSourceOf,
	spillingImageStyle,
	THEME_CROP_ASPECT,
} from "./theme-image-crop";

const centered = { zoom: 1, x: 0.5, y: 0.5 };

describe("theme image crop (spec 043)", () => {
	it("a landscape frame on a wider image takes the full height, centered", () => {
		expect(
			frameSourceOf(
				{ width: 4000, height: 1000 },
				centered,
				THEME_CROP_ASPECT.landscape,
			),
		).toEqual({
			x: (4000 - 1000 * (16 / 9)) / 2,
			y: 0,
			width: 1000 * (16 / 9),
			height: 1000,
		});
	});

	it("a square frame on a tall image takes the full width, at the top when y is 0", () => {
		expect(
			frameSourceOf(
				{ width: 800, height: 1200 },
				{ zoom: 1, x: 0.5, y: 0 },
				THEME_CROP_ASPECT.square,
			),
		).toEqual({ x: 0, y: 0, width: 800, height: 800 });
	});

	it("the zoom takes a smaller part, still within the image", () => {
		const source = frameSourceOf(
			{ width: 1600, height: 900 },
			{ zoom: 2, x: 1, y: 1 },
			THEME_CROP_ASPECT.landscape,
		);

		expect(source).toEqual({ x: 800, y: 450, width: 800, height: 450 });
	});

	it("the image spills out of the frame by its wider side", () => {
		expect(
			spillingImageStyle(
				centered,
				{ width: 4000, height: 1000 },
				THEME_CROP_ASPECT.landscape,
			),
		).toMatchObject({ height: "100%", width: "auto" });
		expect(
			spillingImageStyle(
				{ ...centered, zoom: 2 },
				{ width: 1000, height: 1000 },
				THEME_CROP_ASPECT.landscape,
			),
		).toMatchObject({ width: "200%", height: "auto" });
	});
});
