import type {
	MediaUpload,
	MediaUploadRepository,
	MediaUsage,
} from "../application/ports/media-upload-repository";

/** The pending uploads and, by hand, which files something uses. */
export class InMemoryMediaUploads implements MediaUploadRepository, MediaUsage {
	#uploads: MediaUpload[] = [];
	readonly #inUse = new Set<string>();

	async addMediaUpload(upload: MediaUpload): Promise<void> {
		this.#uploads.push({ ...upload });
	}

	async takeExpiredMediaUploads(
		before: Date,
		limit: number,
	): Promise<string[]> {
		const expired = this.#uploads
			.filter((upload) => upload.createdAt.getTime() < before.getTime())
			.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
			.slice(0, limit)
			.map((upload) => upload.key);
		this.#uploads = this.#uploads.filter(
			(upload) => !expired.includes(upload.key),
		);
		return expired;
	}

	async isMediaInUse(key: string): Promise<boolean> {
		return this.#inUse.has(key);
	}

	/** Test helper: a quiz, question, version or profile points at the file. */
	use(key: string): void {
		this.#inUse.add(key);
	}

	/** Test helper: the keys still recorded. */
	keys(): string[] {
		return this.#uploads.map((upload) => upload.key).sort();
	}
}
