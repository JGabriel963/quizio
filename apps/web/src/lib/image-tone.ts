import { DARK_TEXT, readableTextOn } from "@quizio/core/shared/domain/contrast";
import type { ThemeTone } from "@quizio/core/shared/domain/theme";

/** How small the image is drawn to be measured: enough for an average. */
const SAMPLE_SIZE = 32;

/**
 * The tone of a custom theme's background image (spec 043, RN-12): light
 * when dark text reads better on its average color. Measured here, in the
 * browser, because the server never processes images (spec 007).
 */
export function toneOfPixels(rgba: Uint8ClampedArray): ThemeTone {
	let red = 0;
	let green = 0;
	let blue = 0;
	let counted = 0;
	for (let i = 0; i + 3 < rgba.length; i += 4) {
		// Transparent pixels show the color under them, not theirs.
		if ((rgba[i + 3] ?? 0) < 128) {
			continue;
		}
		red += rgba[i] ?? 0;
		green += rgba[i + 1] ?? 0;
		blue += rgba[i + 2] ?? 0;
		counted += 1;
	}
	if (counted === 0) {
		return "dark";
	}
	const hex = (sum: number) =>
		Math.round(sum / counted)
			.toString(16)
			.padStart(2, "0");
	const average = `#${hex(red)}${hex(green)}${hex(blue)}`;
	return readableTextOn([average]) === DARK_TEXT ? "light" : "dark";
}

/** The tone of an image file; dark when it cannot be read. */
export async function measureImageTone(file: Blob): Promise<ThemeTone> {
	try {
		const bitmap = await createImageBitmap(file);
		const canvas = document.createElement("canvas");
		canvas.width = SAMPLE_SIZE;
		canvas.height = SAMPLE_SIZE;
		const context = canvas.getContext("2d");
		if (!context) {
			return "dark";
		}
		context.drawImage(bitmap, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
		bitmap.close();
		return toneOfPixels(
			context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data,
		);
	} catch {
		return "dark";
	}
}
