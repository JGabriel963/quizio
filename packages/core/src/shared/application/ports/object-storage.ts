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
	delete(key: string): Promise<void>;
}

export interface PresignedUploadRequest {
	key: string;
	contentType: string;
	contentLength: number;
	expiresInSeconds: number;
}

export interface PresignedUpload {
	url: string;
	method: "PUT";
	/** Headers the client must send with the upload for the signature to match. */
	headers: Record<string, string>;
}
