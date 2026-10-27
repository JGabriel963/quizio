/**
 * Port for binary object storage (quiz covers, question media, backgrounds).
 * Implemented by `@quizio/storage` (S3 protocol: Cloudflare R2 in production,
 * RustFS locally). Keys are opaque to adapters; the application decides them.
 */
export interface ObjectStorage {
	/** Returns a short-lived URL the browser uses to upload the object directly. */
	createPresignedUpload(
		input: PresignedUploadRequest,
	): Promise<PresignedUpload>;
	/** Public URL of an object, for rendering. Does not check existence. */
	getPublicUrl(key: string): string;
	exists(key: string): Promise<boolean>;
	/** The object's bytes, or null when it is missing (spec 027: the assistant reads a PDF). */
	read(key: string): Promise<Uint8Array | null>;
	/** Idempotent: deleting a missing object succeeds. */
	delete(key: string): Promise<void>;
	/** Server-side copy, so two owners of the same image can delete independently. */
	copy(sourceKey: string, destinationKey: string): Promise<void>;
	/**
	 * Every object whose key starts with `prefix` (ending in "/"), for
	 * deleting an account (spec 039, RN-39).
	 */
	deletePrefix(prefix: string): Promise<void>;
}

export interface PresignedUploadRequest {
	key: string;
	contentType: string;
	contentLength: number;
	expiresInSeconds: number;
	/**
	 * Signed with the upload, so the browser must send the same header; the
	 * object is served with it (spec 036: a PDF keeps its name, ADR 0017).
	 */
	contentDisposition?: string;
}

export interface PresignedUpload {
	url: string;
	method: "PUT";
	/** Headers the client must send with the upload for the signature to match. */
	headers: Record<string, string>;
}
