import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { isHttpAddress } from "../../shared/domain/web-address";
import { type SniffedFileType, sniffFileType } from "../domain/file-signature";
import { UnsupportedMediaTypeError } from "../domain/media-policy";
import { InvalidFileUrlError } from "../domain/remote-file-errors";
import type {
	RemoteFileTarget,
	RemoteFileUploads,
} from "./ports/remote-file-uploads";
import type { RemoteFiles } from "./ports/remote-files";

export interface ImportRemoteFileInput {
	ownerId: string;
	url: string;
	target: RemoteFileTarget;
}

export type ImportRemoteFile = (
	input: ImportRemoteFileInput,
) => Promise<{ key: string }>;

/** A name for a file whose link gave none. */
const DEFAULT_FILE_NAMES: Record<SniffedFileType, string> = {
	"image/jpeg": "imagem.jpg",
	"image/png": "imagem.png",
	"image/gif": "imagem.gif",
	"image/webp": "imagem.webp",
	"application/pdf": "arquivo.pdf",
};

function assertHttpUrl(raw: string): void {
	if (!isHttpAddress(raw)) {
		throw new InvalidFileUrlError();
	}
}

/**
 * Takes a file from a public link and stores it where the target's own upload
 * would (spec 044, RN-24; ADR 0023): the bytes say what it is, and the
 * target's upload applies its policy and records its pending row. Nothing is
 * stored when any of it refuses.
 */
export function createImportRemoteFile(deps: {
	remoteFiles: RemoteFiles;
	storage: Pick<ObjectStorage, "put">;
	uploads: RemoteFileUploads;
}): ImportRemoteFile {
	return async ({ ownerId, url, target }) => {
		assertHttpUrl(url);
		const file = await deps.remoteFiles.fetch(
			url,
			deps.uploads.maxBytesFor(target),
		);
		const contentType = sniffFileType(file.bytes);
		if (!contentType) {
			throw new UnsupportedMediaTypeError(
				"The file at the link is not a JPEG, PNG, GIF, WebP or PDF file.",
			);
		}
		const { key, contentDisposition } = await deps.uploads.keyFor({
			ownerId,
			target,
			contentType,
			sizeBytes: file.bytes.length,
			fileName: file.fileName ?? DEFAULT_FILE_NAMES[contentType],
		});
		await deps.storage.put(key, file.bytes, contentType, contentDisposition);
		return { key };
	};
}
