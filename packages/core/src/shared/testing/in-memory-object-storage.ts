import type {
	ObjectStorage,
	PresignedUpload,
	PresignedUploadRequest,
} from "../application/ports/object-storage";

export class InMemoryObjectStorage implements ObjectStorage {
	readonly presignedUploads: PresignedUploadRequest[] = [];
	readonly #objects = new Map<string, Uint8Array>();

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

	async read(key: string): Promise<Uint8Array | null> {
		const bytes = this.#objects.get(key);
		return bytes ? new Uint8Array(bytes) : null;
	}

	async delete(key: string): Promise<void> {
		this.#objects.delete(key);
	}

	async copy(sourceKey: string, destinationKey: string): Promise<void> {
		const bytes = this.#objects.get(sourceKey);
		if (!bytes) {
			throw new Error(`Object "${sourceKey}" does not exist`);
		}
		this.#objects.set(destinationKey, new Uint8Array(bytes));
	}

	/** Test helper: every stored key, sorted. */
	keys(): string[] {
		return [...this.#objects.keys()].sort();
	}

	/** Test helper: simulates the browser completing a presigned upload. */
	simulateUpload(key: string): void {
		this.put(key, new Uint8Array());
	}

	/** Test helper: an upload with its bytes. */
	put(key: string, bytes: Uint8Array): void {
		this.#objects.set(key, new Uint8Array(bytes));
	}
}
