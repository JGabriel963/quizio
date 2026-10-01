import { defaultCrop } from "@quizio/core/quiz/domain/question-image";
import { describe, expect, it } from "vitest";

import {
	clampZoom,
	cropFrameStyle,
	croppedImageStyle,
	dragCrop,
	spillingImageStyle,
} from "./image-crop";

describe("image crop", () => {
	it("styles the image with the same anchor for position and zoom", () => {
		expect(
			croppedImageStyle({ shape: "square", zoom: 2, x: 0.25, y: 1 }),
		).toEqual({
			width: "100%",
			height: "100%",
			objectFit: "cover",
			objectPosition: "25% 100%",
			transform: "scale(2)",
			transformOrigin: "25% 100%",
		});
	});

	it("gives the frame its proportion, round for the circle", () => {
		expect(cropFrameStyle(defaultCrop("landscape"))).toEqual({
			aspectRatio: "1.5",
			borderRadius: undefined,
		});
		expect(cropFrameStyle(defaultCrop("circle"))).toEqual({
			aspectRatio: "1",
			borderRadius: "50%",
		});
	});

	describe("in the crop dialog", () => {
		it("a wide image fills the frame's height and spills sideways", () => {
			expect(
				spillingImageStyle(
					{ shape: "square", zoom: 2, x: 0.25, y: 1 },
					{ width: 300, height: 200 },
				),
			).toEqual({
				position: "absolute",
				maxWidth: "none",
				width: "auto",
				height: "200%",
				left: "25%",
				top: "100%",
				transform: "translate(-25%, -100%)",
			});
		});

		it("a tall image fills the frame's width and spills up and down", () => {
			expect(
				spillingImageStyle(defaultCrop("landscape"), {
					width: 200,
					height: 300,
				}),
			).toMatchObject({ width: "100%", height: "auto" });
		});
	});

	it("keeps the zoom between 1 and 3", () => {
		expect(clampZoom(0.2)).toBe(1);
		expect(clampZoom(2.4)).toBe(2.4);
		expect(clampZoom(7)).toBe(3);
	});

	describe("dragging", () => {
		// A 3:2 image under a square frame of 100 px: 50 px of horizontal travel.
		const image = { width: 300, height: 200 };
		const frame = { width: 100, height: 100 };

		it("dragging right shows what is further left", () => {
			const dragged = dragCrop(
				defaultCrop("square"),
				{ dx: 25, dy: 0 },
				image,
				frame,
			);

			expect(dragged.x).toBe(0);
			expect(dragged.y).toBe(0.5);
		});

		it("stops at the edges of the image", () => {
			const dragged = dragCrop(
				defaultCrop("square"),
				{ dx: -500, dy: 0 },
				image,
				frame,
			);

			expect(dragged.x).toBe(1);
		});

		it("an axis without free travel stays put", () => {
			const dragged = dragCrop(
				defaultCrop("square"),
				{ dx: 0, dy: 40 },
				image,
				frame,
			);

			expect(dragged.y).toBe(0.5);
		});

		it("zoom opens travel on both axes", () => {
			// At 3x the image is 450 x 300 under the 100 px frame.
			const dragged = dragCrop(
				{ ...defaultCrop("square"), zoom: 3 },
				{ dx: -35, dy: 20 },
				image,
				frame,
			);

			expect(dragged.x).toBeCloseTo(0.6);
			expect(dragged.y).toBeCloseTo(0.4);
		});

		it("ignores an image that has not loaded", () => {
			const crop = defaultCrop();

			expect(
				dragCrop(crop, { dx: 10, dy: 10 }, { width: 0, height: 0 }, frame),
			).toBe(crop);
		});
	});
});
