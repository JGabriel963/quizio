import type { CSSProperties } from "react";

import type { Size } from "./image-crop";

/**
 * "Recortar imagem" of "Crie seu tema" (spec 043): the logo in Paisagem or
 * Quadrado, the background in Paisagem, the game screens' 16:9. The browser
 * cuts the image and sends only that, as the profile photo (spec 039).
 */
export type ThemeCropShape = "landscape" | "square";

export const THEME_CROP_ASPECT: Record<ThemeCropShape, number> = {
	landscape: 16 / 9,
	square: 1,
};

/** As the questions' crop: zoom from 1, x/y the fraction of the free travel. */
export interface ThemeCrop {
	zoom: number;
	x: number;
	y: number;
}

export const THEME_CROP_MAX_ZOOM = 3;

/** Widths of what is sent: a full screen behind, and a logo's room. */
export const CROPPED_WIDTH = { background: 1920, logo: 800 } as const;

const percent = (fraction: number) => `${fraction * 100}%`;

/** The part of the image inside the frame, in the image's own pixels. */
export function frameSourceOf(
	image: Size,
	crop: ThemeCrop,
	aspect: number,
): { x: number; y: number; width: number; height: number } {
	const wider = image.width / image.height >= aspect;
	const width = (wider ? image.height * aspect : image.width) / crop.zoom;
	const height = (wider ? image.height : image.width / aspect) / crop.zoom;
	return {
		x: (image.width - width) * crop.x,
		y: (image.height - height) * crop.y,
		width,
		height,
	};
}

/**
 * The `<img>` inside the dialog's frame: covering it at the zoom and spilling
 * out, so what is left out stays visible around it.
 */
export function spillingImageStyle(
	crop: ThemeCrop,
	image: Size,
	aspect: number,
): CSSProperties {
	const wider = image.width / image.height >= aspect;
	return {
		position: "absolute",
		maxWidth: "none",
		width: wider ? "auto" : percent(crop.zoom),
		height: wider ? percent(crop.zoom) : "auto",
		left: percent(crop.x),
		top: percent(crop.y),
		transform: `translate(${percent(-crop.x)}, ${percent(-crop.y)})`,
	};
}

/**
 * Draws the framed part at `width` pixels and encodes it as WebP, keeping
 * transparency (a logo's). A GIF becomes a still image.
 */
export async function cropImage(
	file: Blob,
	crop: ThemeCrop,
	aspect: number,
	width: number,
): Promise<File> {
	const bitmap = await createImageBitmap(file);
	try {
		const source = frameSourceOf(
			{ width: bitmap.width, height: bitmap.height },
			crop,
			aspect,
		);
		// Never larger than the part cut, so a small logo stays sharp.
		const outWidth = Math.round(Math.min(width, source.width));
		const outHeight = Math.round(outWidth / aspect);
		const canvas = document.createElement("canvas");
		canvas.width = outWidth;
		canvas.height = outHeight;
		const context = canvas.getContext("2d");
		if (!context) {
			throw new Error("Canvas 2D is not available");
		}
		context.drawImage(
			bitmap,
			source.x,
			source.y,
			source.width,
			source.height,
			0,
			0,
			outWidth,
			outHeight,
		);
		const blob = await new Promise<Blob>((resolve, reject) => {
			canvas.toBlob(
				(result) =>
					result ? resolve(result) : reject(new Error("Could not encode")),
				"image/webp",
				0.9,
			);
		});
		return new File([blob], "theme.webp", { type: "image/webp" });
	} finally {
		bitmap.close();
	}
}
