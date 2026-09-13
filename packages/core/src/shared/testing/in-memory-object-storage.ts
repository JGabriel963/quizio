import type {
	ObjectStorage,
	PresignedUpload,
	PresignedUploadRequest,
} from "../application/ports/object-storage";

export class InMemoryObjectStorage implements ObjectStorage {
	readonly presignedUploads: PresignedUploadRequest[] = [];
	readonly #objects = new Set<string>();

	constructor(private readonly publicBaseUrl = "https://media.test") {}

	async createPresignedUpload(
		input: PresignedUploadRequest,
	): Promise<PresignedUpload> {
		this.presignedUploads.push(input);
		return {
			url: `${this.publicBaseUrl}/upload/${input.key}`,
			method: "PUT",
			headers: { "content-type": input.contentType },
		};
	}

	getPublicUrl(key: string): string {
		return `${this.publicBaseUrl}/${key}`;
	}

	async exists(key: string): Promise<boolean> {
		return this.#objects.has(key);
	}

	async delete(key: string): Promise<void> {
		this.#objects.delete(key);
	}

	/** Test helper: simulates the browser completing a presigned upload. */
	simulateUpload(key: string): void {
		this.#objects.add(key);
	}
}
