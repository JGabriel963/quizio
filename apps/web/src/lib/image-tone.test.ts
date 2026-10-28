import { describe, expect, it } from "vitest";

import { toneOfPixels } from "./image-tone";

/** `count` RGBA pixels of one color. */
function pixels(count: number, [r, g, b]: [number, number, number]) {
	const data = new Uint8ClampedArray(count * 4);
	for (let i = 0; i < count; i += 1) {
		data.set([r, g, b, 255], i * 4);
	}
	return data;
}

describe("toneOfPixels (spec 043, RN-12)", () => {
	it("a mostly white image is light", () => {
		expect(toneOfPixels(pixels(16, [245, 245, 240]))).toBe("light");
	});

	it("a dark one is dark", () => {
		expect(toneOfPixels(pixels(16, [20, 30, 60]))).toBe("dark");
	});

	it("goes by the text that reads better on the average color", () => {
		const half = new Uint8ClampedArray([
			...pixels(8, [255, 255, 255]),
			...pixels(8, [0, 0, 0]),
		]);

		// The average is mid gray, on which dark text reads better.
		expect(toneOfPixels(half)).toBe("light");
	});

	it("leaves transparent pixels out", () => {
		const data = pixels(4, [0, 0, 0]);
		data.set([255, 255, 255, 255], 0);
		for (const i of [1, 2, 3]) {
			data[i * 4 + 3] = 0;
		}

		expect(toneOfPixels(data)).toBe("light");
	});
});
