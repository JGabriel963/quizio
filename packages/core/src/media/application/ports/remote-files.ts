/** A file as a remote server answered with it. */
export interface RemoteFile {
	bytes: Uint8Array;
	/** What the remote server said it is; the bytes decide (spec 044, RN-24). */
	contentType: string | null;
	/** From `Content-Disposition` or the address's path, if any. */
	fileName: string | null;
}

/**
 * Takes a file from a public link, for agents that cannot upload one (spec
 * 044, RN-24; ADR 0023). The adapter refuses anything but a public internet
 * address, at connection time and on every redirect, and stops reading past
 * `maxBytes`.
 */
export interface RemoteFiles {
	/** Throws the `MEDIA.*` link errors of `remote-file-errors.ts`. */
	fetch(url: string, maxBytes: number): Promise<RemoteFile>;
}
