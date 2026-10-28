import { DomainError } from "../../shared/domain/domain-error";

/**
 * Why a file could not be taken from a link (spec 044, RN-24): the agent is
 * told the reason, and nothing is stored.
 */
export class InvalidFileUrlError extends DomainError {
	readonly code = "MEDIA.INVALID_URL";
	constructor() {
		super("The file's link must be an http or https address.");
	}
}

/** The address resolves to a private, loopback, link-local or metadata network. */
export class FileUrlNotPublicError extends DomainError {
	readonly code = "MEDIA.URL_NOT_PUBLIC";
	constructor() {
		super("The file's link must be a public internet address.");
	}
}

/** No answer in time, a status other than 2xx, or too many redirects. */
export class FileUrlUnreachableError extends DomainError {
	readonly code = "MEDIA.URL_UNREACHABLE";
}

export class FileUrlTooLargeError extends DomainError {
	readonly code = "MEDIA.URL_TOO_LARGE";
	constructor(readonly maxBytes: number) {
		super(
			`The file at the link is larger than ${Math.round(maxBytes / (1024 * 1024))} MB.`,
		);
	}
}
