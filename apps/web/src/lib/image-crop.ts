import {
	CROP_MAX_ZOOM,
	CROP_MIN_ZOOM,
	cropAspectRatio,
	type ImageCrop,
} from "@quizio/core/quiz/domain/question-image";
import type { CSSProperties } from "react";

export interface Size {
	width: number;
	height: number;
}

const percent = (fraction: number) => `${fraction * 100}%`;

const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value));

/**
 * Style of an `<img>` that fills a frame of the crop's shape: `cover` fits the
 * widest framing, and the same anchor for position and zoom makes `x`/`y` the
 * fraction of the free travel, whatever the image's dimensions (spec 007, RN-22).
 */
export function croppedImageStyle(crop: ImageCrop): CSSProperties {
	const anchor = `${percent(crop.x)} ${percent(crop.y)}`;
	return {
		width: "100%",
		height: "100%",
		objectFit: "cover",
		objectPosition: anchor,
		transform: `scale(${crop.zoom})`,
		transformOrigin: anchor,
	};
}

/** Style of the frame itself: its proportion and, for the circle, its outline. */
export function cropFrameStyle(crop: ImageCrop): CSSProperties {
	return {
		aspectRatio: String(cropAspectRatio(crop.shape)),
		borderRadius: crop.shape === "circle" ? "50%" : undefined,
	};
}

/**
 * Style of the `<img>` inside the crop dialog's frame: the same framing as
 * `croppedImageStyle`, but the image keeps its own box and spills out of the
 * frame, so what the crop leaves out stays visible around it (RN-19).
 */
export function spillingImageStyle(
	crop: ImageCrop,
	image: Size,
): CSSProperties {
	const wider = image.width / image.height >= cropAspectRatio(crop.shape);
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

export function clampZoom(zoom: number): number {
	return clamp(zoom, CROP_MIN_ZOOM, CROP_MAX_ZOOM);
}

/**
 * The crop after the image was dragged by `delta` pixels under a frame of
 * `frame` pixels: dragging right shows what is further left. An axis with no
 * free travel stays where it is.
 */
export function dragCrop(
	crop: ImageCrop,
	delta: { dx: number; dy: number },
	image: Size,
	frame: Size,
): ImageCrop {
	if (image.width <= 0 || image.height <= 0) {
		return crop;
	}
	const cover = Math.max(
		frame.width / image.width,
		frame.height / image.height,
	);
	const travelX = image.width * cover * crop.zoom - frame.width;
	const travelY = image.height * cover * crop.zoom - frame.height;
	return {
		...crop,
		x: travelX > 0.5 ? clamp(crop.x - delta.dx / travelX, 0, 1) : crop.x,
		y: travelY > 0.5 ? clamp(crop.y - delta.dy / travelY, 0, 1) : crop.y,
	};
}
