import {
	type ImageCrop,
	type ImageCropInput,
	InvalidImageCropError,
	InvalidQuestionImageError,
	parseImageAltText,
	parseImageCrop,
	parseStoredImage,
} from "./question-image";

/** The frames an answer's image takes: no circle (spec 049, RN-11). */
export const ANSWER_CROP_SHAPES = ["landscape", "portrait", "square"] as const;

/**
 * An answer shown as an image instead of text (spec 049, RN-01, RN-04): the
 * upload's key, an optional crop and an optional alt text. No placement: an
 * answer's image is never a background.
 */
export interface AnswerImage {
	key: string;
	/** Never a circle; null shows the whole image. */
	crop: ImageCrop | null;
	altText: string | null;
}

/** A fresh answer image: whole and undescribed. */
export function newAnswerImage(key: string): AnswerImage {
	return { key, crop: null, altText: null };
}

function isAnswerShape(shape: string): boolean {
	return (ANSWER_CROP_SHAPES as readonly string[]).includes(shape);
}

/** The crop of "Recortar imagem" for an answer (RN-11). */
export function parseAnswerCrop(input: ImageCropInput): ImageCrop {
	if (!isAnswerShape(input.shape)) {
		throw new InvalidImageCropError(
			`An answer's image is cropped as ${ANSWER_CROP_SHAPES.join(", ")}`,
		);
	}
	return parseImageCrop(input);
}

/** Reads a stored answer image tolerantly: without a key there is none. */
export function readAnswerImage(raw: unknown): AnswerImage | null {
	const stored = parseStoredImage(raw);
	if (!stored) {
		return null;
	}
	return {
		key: stored.key,
		crop: stored.crop && isAnswerShape(stored.crop.shape) ? stored.crop : null,
		altText: stored.altText,
	};
}

export function copyAnswerImage(image: AnswerImage | null): AnswerImage | null {
	return image
		? { ...image, crop: image.crop ? { ...image.crop } : null }
		: null;
}

/** Same file with the same adjustments (spec 049, RN-17). */
export function sameAnswerImage(
	a: AnswerImage | null,
	b: AnswerImage | null,
): boolean {
	if (a === null || b === null) {
		return a === b;
	}
	const sameCrop =
		a.crop === null || b.crop === null
			? a.crop === b.crop
			: a.crop.shape === b.crop.shape &&
				a.crop.zoom === b.crop.zoom &&
				a.crop.x === b.crop.x &&
				a.crop.y === b.crop.y;
	return a.key === b.key && a.altText === b.altText && sameCrop;
}

/** An answer's image as a client or an agent sends it. */
export interface AnswerImageInput {
	key: string;
	crop?: ImageCropInput | null;
	altText?: string | null;
}

/** Checks an answer's image as the edits do (RN-11, RN-12); the key's owner is the use case's. */
export function parseAnswerImage(input: AnswerImageInput): AnswerImage {
	if (typeof input.key !== "string" || input.key === "") {
		throw new InvalidQuestionImageError("An answer image needs a file");
	}
	return {
		key: input.key,
		crop: input.crop ? parseAnswerCrop(input.crop) : null,
		altText: parseImageAltText(input.altText),
	};
}
