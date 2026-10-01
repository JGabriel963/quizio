import { describe, expect, it } from "vitest";

import {
	copyImage,
	cropAspectRatio,
	defaultCrop,
	ImageAltTextTooLongError,
	InvalidImageCropError,
	InvalidImagePlacementError,
	newQuestionImage,
	parseImageAltText,
	parseImageCrop,
	parseImagePlacement,
	parseStoredImage,
	sameImage,
} from "./question-image";

describe("QuestionImage", () => {
	it("a new image sits in the middle without crop or alt text", () => {
		expect(newQuestionImage("media/u1/a.png")).toEqual({
			key: "media/u1/a.png",
			placement: "media",
			crop: null,
			altText: null,
		});
	});

	it("knows the placements", () => {
		expect(parseImagePlacement("background")).toBe("background");
		expect(() => parseImagePlacement("left")).toThrow(
			InvalidImagePlacementError,
		);
	});

	it("gives each shape its aspect ratio", () => {
		expect(cropAspectRatio("landscape")).toBe(3 / 2);
		expect(cropAspectRatio("portrait")).toBe(2 / 3);
		expect(cropAspectRatio("square")).toBe(1);
		expect(cropAspectRatio("circle")).toBe(1);
	});

	it("opens the crop on the widest centered landscape", () => {
		expect(defaultCrop()).toEqual({
			shape: "landscape",
			zoom: 1,
			x: 0.5,
			y: 0.5,
		});
	});

	describe("validates the crop", () => {
		it("accepts the limits", () => {
			expect(parseImageCrop({ shape: "circle", zoom: 3, x: 0, y: 1 })).toEqual({
				shape: "circle",
				zoom: 3,
				x: 0,
				y: 1,
			});
		});

		it.each([
			{ shape: "star", zoom: 1, x: 0.5, y: 0.5 },
			{ shape: "square", zoom: 0.9, x: 0.5, y: 0.5 },
			{ shape: "square", zoom: 3.1, x: 0.5, y: 0.5 },
			{ shape: "square", zoom: 1, x: -0.1, y: 0.5 },
			{ shape: "square", zoom: 1, x: 0.5, y: 1.1 },
			{ shape: "square", zoom: Number.NaN, x: 0.5, y: 0.5 },
		])("refuses %o", (crop) => {
			expect(() => parseImageCrop(crop)).toThrow(InvalidImageCropError);
		});
	});

	describe("limits the alt text", () => {
		it("trims and turns blank into null", () => {
			expect(parseImageAltText("  Ponte ao pôr do sol ")).toBe(
				"Ponte ao pôr do sol",
			);
			expect(parseImageAltText("   ")).toBeNull();
			expect(parseImageAltText(null)).toBeNull();
		});

		it("accepts 1000 characters and refuses 1001", () => {
			expect(parseImageAltText("a".repeat(1000))).toHaveLength(1000);
			expect(() => parseImageAltText("a".repeat(1001))).toThrow(
				ImageAltTextTooLongError,
			);
		});
	});

	describe("reads a stored image tolerantly", () => {
		it("reads a full image", () => {
			const stored = {
				key: "media/u1/a.png",
				placement: "background",
				crop: { shape: "square", zoom: 2, x: 0.25, y: 0.75 },
				altText: "Mapa",
			};
			expect(parseStoredImage(stored)).toEqual(stored);
		});

		it("has no image without a key", () => {
			expect(parseStoredImage(null)).toBeNull();
			expect(parseStoredImage({})).toBeNull();
			expect(parseStoredImage({ key: "" })).toBeNull();
			expect(parseStoredImage("media/u1/a.png")).toBeNull();
		});

		it("falls back to the defaults on bad adjustments", () => {
			expect(
				parseStoredImage({
					key: "media/u1/a.png",
					placement: "left",
					crop: { shape: "square", zoom: 9 },
					altText: 3,
				}),
			).toEqual(newQuestionImage("media/u1/a.png"));
		});
	});

	describe("compares images", () => {
		const image = {
			...newQuestionImage("media/u1/a.png"),
			crop: defaultCrop("square"),
		};

		it("equal images are the same", () => {
			expect(sameImage(image, copyImage(image))).toBe(true);
			expect(sameImage(null, null)).toBe(true);
		});

		it.each([
			null,
			{ ...image, key: "media/u1/b.png" },
			{ ...image, placement: "background" as const },
			{ ...image, altText: "Mapa" },
			{ ...image, crop: null },
			{ ...image, crop: defaultCrop("circle") },
			{ ...image, crop: { ...defaultCrop("square"), zoom: 2 } },
		])("a difference is seen: %o", (other) => {
			expect(sameImage(image, other)).toBe(false);
		});
	});

	it("a copy shares nothing with the source", () => {
		const image = {
			...newQuestionImage("media/u1/a.png"),
			crop: defaultCrop(),
		};
		const copy = copyImage(image);
		expect(copy).toEqual(image);
		expect(copy?.crop).not.toBe(image.crop);
	});
});
