import { DomainError } from "../../shared/domain/domain-error";
import { characterCount } from "../../shared/domain/text-length";

/** In the media area, or behind the whole question (spec 007, RN-04). */
export const IMAGE_PLACEMENTS = ["media", "background"] as const;
export type ImagePlacement = (typeof IMAGE_PLACEMENTS)[number];

/** The frames of "Recortar imagem" (spec 007, RN-18). */
export const CROP_SHAPES = [
	"landscape",
	"portrait",
	"square",
	"circle",
] as const;
export type CropShape = (typeof CROP_SHAPES)[number];

export const CROP_MIN_ZOOM = 1;
/** Three times the widest framing (RN-20). */
export const CROP_MAX_ZOOM = 3;
export const IMAGE_ALT_TEXT_MAX_LENGTH = 1000;

/**
 * A framing of the image, independent of its dimensions: it is redone from the
 * uploaded file, which is never changed (RN-22).
 */
export interface ImageCrop {
	shape: CropShape;
	/** 1 = the frame takes as much of the image as it can; up to `CROP_MAX_ZOOM`. */
	zoom: number;
	/** Where the frame sits along its free travel, 0 to 1; 0.5 is centered. */
	x: number;
	y: number;
}

/** The optional image of a question, of any type (spec 007, RN-01). */
export interface QuestionImage {
	/** Object key of the upload; URLs are made from it when reading. */
	key: string;
	placement: ImagePlacement;
	crop: ImageCrop | null;
	altText: string | null;
}

/** A crop as a client sends it. */
export interface ImageCropInput {
	shape: string;
	zoom: number;
	x: number;
	y: number;
}

export class InvalidQuestionImageError extends DomainError {
	readonly code = "QUIZ.INVALID_IMAGE";
}

export class QuestionHasNoImageError extends DomainError {
	readonly code = "QUIZ.NO_IMAGE";
}

export class InvalidImagePlacementError extends DomainError {
	readonly code = "QUIZ.INVALID_IMAGE_PLACEMENT";
}

export class InvalidImageCropError extends DomainError {
	readonly code = "QUIZ.INVALID_IMAGE_CROP";
}

export class ImageAltTextTooLongError extends DomainError {
	readonly code = "QUIZ.IMAGE_ALT_TEXT_TOO_LONG";
}

/** A fresh image: in the middle, whole and undescribed (RN-13). */
export function newQuestionImage(key: string): QuestionImage {
	return { key, placement: "media", crop: null, altText: null };
}

/** Width over height of each frame (RN-18). */
export function cropAspectRatio(shape: CropShape): number {
	switch (shape) {
		case "landscape":
			return 3 / 2;
		case "portrait":
			return 2 / 3;
		case "square":
		case "circle":
			return 1;
	}
}

/** What "Recortar imagem" opens with: the widest landscape framing (RN-21). */
export function defaultCrop(shape: CropShape = "landscape"): ImageCrop {
	return { shape, zoom: CROP_MIN_ZOOM, x: 0.5, y: 0.5 };
}

function isPlacement(value: unknown): value is ImagePlacement {
	return (IMAGE_PLACEMENTS as readonly unknown[]).includes(value);
}

function isShape(value: unknown): value is CropShape {
	return (CROP_SHAPES as readonly unknown[]).includes(value);
}

function isWithin(value: unknown, min: number, max: number): value is number {
	return (
		typeof value === "number" &&
		Number.isFinite(value) &&
		value >= min &&
		value <= max
	);
}

function isCrop(value: unknown): value is ImageCrop {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const { shape, zoom, x, y } = value as Record<string, unknown>;
	return (
		isShape(shape) &&
		isWithin(zoom, CROP_MIN_ZOOM, CROP_MAX_ZOOM) &&
		isWithin(x, 0, 1) &&
		isWithin(y, 0, 1)
	);
}

export function parseImagePlacement(placement: string): ImagePlacement {
	if (!isPlacement(placement)) {
		throw new InvalidImagePlacementError(
			`Image placement "${placement}" is not supported`,
		);
	}
	return placement;
}

export function parseImageCrop(input: ImageCropInput): ImageCrop {
	if (!isCrop(input)) {
		throw new InvalidImageCropError(
			`A crop has a known shape, a zoom from ${CROP_MIN_ZOOM} to ${CROP_MAX_ZOOM} and a position from 0 to 1`,
		);
	}
	return { shape: input.shape, zoom: input.zoom, x: input.x, y: input.y };
}

/** Trims, turns blank text into null and enforces the limit (RN-29). */
export function parseImageAltText(
	raw: string | null | undefined,
): string | null {
	const text = raw?.trim() ?? "";
	if (text === "") {
		return null;
	}
	if (characterCount(text) > IMAGE_ALT_TEXT_MAX_LENGTH) {
		throw new ImageAltTextTooLongError(
			`Alt text must have at most ${IMAGE_ALT_TEXT_MAX_LENGTH} characters`,
		);
	}
	return text;
}

/**
 * Reads a stored image tolerantly: without a usable key there is no image, and
 * a bad adjustment falls back to its default.
 */
export function parseStoredImage(raw: unknown): QuestionImage | null {
	if (typeof raw !== "object" || raw === null) {
		return null;
	}
	const { key, placement, crop, altText } = raw as Record<string, unknown>;
	if (typeof key !== "string" || key === "") {
		return null;
	}
	return {
		key,
		placement: isPlacement(placement) ? placement : "media",
		crop: isCrop(crop)
			? { shape: crop.shape, zoom: crop.zoom, x: crop.x, y: crop.y }
			: null,
		altText: typeof altText === "string" && altText !== "" ? altText : null,
	};
}

export function copyImage(image: QuestionImage | null): QuestionImage | null {
	return image
		? { ...image, crop: image.crop ? { ...image.crop } : null }
		: null;
}

function sameCrop(a: ImageCrop | null, b: ImageCrop | null): boolean {
	if (a === null || b === null) {
		return a === b;
	}
	return a.shape === b.shape && a.zoom === b.zoom && a.x === b.x && a.y === b.y;
}

/** Same file with the same adjustments (spec 007, RN-35). */
export function sameImage(
	a: QuestionImage | null,
	b: QuestionImage | null,
): boolean {
	if (a === null || b === null) {
		return a === b;
	}
	return (
		a.key === b.key &&
		a.placement === b.placement &&
		a.altText === b.altText &&
		sameCrop(a.crop, b.crop)
	);
}
