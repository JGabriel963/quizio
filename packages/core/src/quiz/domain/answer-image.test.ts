import { describe, expect, it } from "vitest";

import {
	copyAnswerImage,
	newAnswerImage,
	parseAnswerCrop,
	readAnswerImage,
	sameAnswerImage,
} from "./answer-image";
import { InvalidImageCropError } from "./question-image";

const square = { shape: "square", zoom: 2, x: 0.5, y: 0.25 };

describe("AnswerImage (spec 049)", () => {
	it("newAnswerImage has no crop and no alt text", () => {
		expect(newAnswerImage("media/ana/a.png")).toEqual({
			key: "media/ana/a.png",
			crop: null,
			altText: null,
		});
	});

	it("parseAnswerCrop takes landscape, portrait and square and refuses a circle", () => {
		for (const shape of ["landscape", "portrait", "square"]) {
			expect(parseAnswerCrop({ ...square, shape }).shape).toBe(shape);
		}
		expect(() => parseAnswerCrop({ ...square, shape: "circle" })).toThrow(
			InvalidImageCropError,
		);
	});

	it("readAnswerImage reads a stored image and drops one without a key or with a bad crop", () => {
		expect(
			readAnswerImage({
				key: "media/ana/a.png",
				crop: square,
				altText: "Arroz",
			}),
		).toEqual({ key: "media/ana/a.png", crop: square, altText: "Arroz" });
		expect(readAnswerImage({ crop: square })).toBeNull();
		expect(readAnswerImage(null)).toBeNull();
		expect(readAnswerImage(undefined)).toBeNull();
		expect(
			readAnswerImage({
				key: "media/ana/a.png",
				crop: { ...square, shape: "circle" },
			}),
		).toEqual({ key: "media/ana/a.png", crop: null, altText: null });
	});

	it("copyAnswerImage is deep", () => {
		const image = {
			key: "media/ana/a.png",
			crop: { ...square, shape: "square" as const },
			altText: null,
		};
		const copy = copyAnswerImage(image);

		expect(copy).toEqual(image);
		expect(copy?.crop).not.toBe(image.crop);
		expect(copyAnswerImage(null)).toBeNull();
	});

	it("sameAnswerImage compares file and adjustments", () => {
		const image = newAnswerImage("media/ana/a.png");

		expect(sameAnswerImage(image, { ...image })).toBe(true);
		expect(sameAnswerImage(image, { ...image, altText: "x" })).toBe(false);
		expect(sameAnswerImage(image, null)).toBe(false);
		expect(sameAnswerImage(null, null)).toBe(true);
	});
});
