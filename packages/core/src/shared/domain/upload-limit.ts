import { DomainError } from "./domain-error";

/**
 * Files a person may send in each window, of every kind together: images,
 * PDFs, photos, theme files and group attachments (audit L4). Far more than
 * an hour of editing needs, and a cap on using the bucket as free hosting.
 */
export const UPLOAD_LIMIT = 200;
export const UPLOAD_WINDOW_MS = 60 * 60 * 1000;

/**
 * Files a person may have Quizio fetch from links in each window (audit L4):
 * each one is downloaded by the server before anything else is checked.
 */
export const REMOTE_FILE_LIMIT = 60;

export class TooManyUploadsError extends DomainError {
	readonly code = "UPLOAD.TOO_MANY";
}
