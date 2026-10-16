export interface SourceUpload {
	key: string;
	ownerId: string;
	createdAt: Date;
}

/**
 * The PDFs sent to the creation assistant, kept only to delete them later
 * (spec 027, RN-18): the bucket is never listed.
 */
export interface SourceUploadRepository {
	add(upload: SourceUpload): Promise<void>;
	/** Idempotent. */
	remove(key: string): Promise<void>;
	/** Removes and returns the keys of up to `limit` uploads created before `before`. */
	takeExpired(before: Date, limit: number): Promise<string[]>;
}
