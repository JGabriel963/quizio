import type { ImageCrop } from "@quizio/core/quiz/domain/question-image";

import type { Size } from "@/lib/image-crop";

/** The side of the photo the browser sends (spec 039; ADR 0019). */
export const PROFILE_PHOTO_SIZE = 512;

/**
 * The part of the image inside the circle, in the image's own pixels: the
 * same framing the dialog draws with `spillingImageStyle` (a square frame
 * covered by the image, zoomed, at x/y of its free travel).
 */
export function squareSourceOf(
	image: Size,
	crop: ImageCrop,
): { x: number; y: number; size: number } {
	const size = Math.min(image.width, image.height) / crop.zoom;
	return {
		x: (image.width - size) * crop.x,
		y: (image.height - size) * crop.y,
		size,
	};
}

/**
 * Draws the framed square at 512 px and encodes it as WebP: only this goes to
 * storage, so every screen shows the photo with a plain `<img>`. A GIF
 * becomes a still image.
 */
export async function cropToSquare(file: File, crop: ImageCrop): Promise<Blob> {
	const bitmap = await createImageBitmap(file);
	try {
		const source = squareSourceOf(
			{ width: bitmap.width, height: bitmap.height },
			crop,
		);
		const canvas = document.createElement("canvas");
		canvas.width = PROFILE_PHOTO_SIZE;
		canvas.height = PROFILE_PHOTO_SIZE;
		const context = canvas.getContext("2d");
		if (!context) {
			throw new Error("Canvas 2D is not available");
		}
		context.drawImage(
			bitmap,
			source.x,
			source.y,
			source.size,
			source.size,
			0,
			0,
			PROFILE_PHOTO_SIZE,
			PROFILE_PHOTO_SIZE,
		);
		return await new Promise<Blob>((resolve, reject) => {
			canvas.toBlob(
				(blob) =>
					blob
						? resolve(blob)
						: reject(new Error("Could not encode the photo")),
				"image/webp",
				0.9,
			);
		});
	} finally {
		bitmap.close();
	}
}
