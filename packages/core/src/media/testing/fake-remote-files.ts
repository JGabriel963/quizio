import type {
	RemoteFile,
	RemoteFiles,
} from "../application/ports/remote-files";
import {
	FileUrlTooLargeError,
	FileUrlUnreachableError,
} from "../domain/remote-file-errors";

/** Answers the links served here by hand; any other does not answer. */
export class FakeRemoteFiles implements RemoteFiles {
	readonly #files = new Map<string, RemoteFile | Error>();

	serve(
		url: string,
		file: { bytes: Uint8Array; contentType?: string; fileName?: string },
	): void {
		this.#files.set(url, {
			bytes: file.bytes,
			contentType: file.contentType ?? null,
			fileName: file.fileName ?? null,
		});
	}

	/** The link fails with this error, as the adapter would. */
	fail(url: string, error: Error): void {
		this.#files.set(url, error);
	}

	async fetch(url: string, maxBytes: number): Promise<RemoteFile> {
		const file = this.#files.get(url);
		if (!file) {
			throw new FileUrlUnreachableError(`${url} did not answer.`);
		}
		if (file instanceof Error) {
			throw file;
		}
		if (file.bytes.length > maxBytes) {
			throw new FileUrlTooLargeError(maxBytes);
		}
		return { ...file, bytes: new Uint8Array(file.bytes) };
	}
}
