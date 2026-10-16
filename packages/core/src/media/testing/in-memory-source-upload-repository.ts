import type {
	SourceUpload,
	SourceUploadRepository,
} from "../application/ports/source-upload-repository";

export class InMemorySourceUploadRepository implements SourceUploadRepository {
	#uploads: SourceUpload[] = [];

	async add(upload: SourceUpload): Promise<void> {
		this.#uploads.push({ ...upload });
	}

	async remove(key: string): Promise<void> {
		this.#uploads = this.#uploads.filter((upload) => upload.key !== key);
	}

	async takeExpired(before: Date, limit: number): Promise<string[]> {
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

	/** Test helper: the keys still recorded. */
	keys(): string[] {
		return this.#uploads.map((upload) => upload.key).sort();
	}
}
