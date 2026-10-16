import { DomainError } from "../../shared/domain/domain-error";

/**
 * What the creation assistant accepts as a source document (spec 027, RN-13):
 * a PDF of up to 20 MB, a technical limit configurable here.
 */
export const SOURCE_CONTENT_TYPE = "application/pdf";
export const SOURCE_MAX_BYTES = 20 * 1024 * 1024;

export class UnsupportedSourceTypeError extends DomainError {
	readonly code = "MEDIA.UNSUPPORTED_SOURCE_TYPE";
}

export class InvalidSourceSizeError extends DomainError {
	readonly code = "MEDIA.INVALID_SOURCE_SIZE";
}

export function assertSourceContentType(
	contentType: string,
): typeof SOURCE_CONTENT_TYPE {
	if (contentType !== SOURCE_CONTENT_TYPE) {
		throw new UnsupportedSourceTypeError(
			`Content type "${contentType}" is not a PDF`,
		);
	}
	return SOURCE_CONTENT_TYPE;
}

export function assertSourceSize(sizeBytes: number): void {
	if (
		!Number.isInteger(sizeBytes) ||
		sizeBytes <= 0 ||
		sizeBytes > SOURCE_MAX_BYTES
	) {
		throw new InvalidSourceSizeError(
			`A PDF must have between 1 byte and ${SOURCE_MAX_BYTES} bytes, received ${sizeBytes}`,
		);
	}
}
