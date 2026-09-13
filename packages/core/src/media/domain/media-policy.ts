import { DomainError } from "../../shared/domain/domain-error";

/** Content types accepted for uploads, mapped to the stored file extension. */
export const MEDIA_EXTENSIONS = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/gif": "gif",
	"image/webp": "webp",
} as const;

export type MediaContentType = keyof typeof MEDIA_EXTENSIONS;

export const MAX_MEDIA_BYTES = 10 * 1024 * 1024;

export class UnsupportedMediaTypeError extends DomainError {
	readonly code = "MEDIA.UNSUPPORTED_TYPE";
}

export class InvalidMediaSizeError extends DomainError {
	readonly code = "MEDIA.INVALID_SIZE";
}

export function assertMediaContentType(contentType: string): MediaContentType {
	if (!Object.hasOwn(MEDIA_EXTENSIONS, contentType)) {
		throw new UnsupportedMediaTypeError(
			`Content type "${contentType}" is not supported`,
		);
	}
	return contentType as MediaContentType;
}

export function assertMediaSize(sizeBytes: number): void {
	if (
		!Number.isInteger(sizeBytes) ||
		sizeBytes <= 0 ||
		sizeBytes > MAX_MEDIA_BYTES
	) {
		throw new InvalidMediaSizeError(
			`File size must be between 1 byte and ${MAX_MEDIA_BYTES} bytes, received ${sizeBytes}`,
		);
	}
}
