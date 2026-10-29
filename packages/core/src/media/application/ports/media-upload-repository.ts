export interface MediaUpload {
	key: string;
	ownerId: string;
	createdAt: Date;
}

/**
 * The images and photos a browser was given an address to send, under
 * `media/` and `profiles/`, kept only to find the ones never used (audit
 * L4): the bucket is never listed. Named apart from the other upload stores,
 * since one test store may hold them all.
 */
export interface MediaUploadRepository {
	addMediaUpload(upload: MediaUpload): Promise<void>;
	/** Removes and returns the keys of up to `limit` uploads created before `before`. */
	takeExpiredMediaUploads(before: Date, limit: number): Promise<string[]>;
}

/** Whether anything points at a file: a quiz, a question, a version or a profile. */
export interface MediaUsage {
	isMediaInUse(key: string): Promise<boolean>;
}
