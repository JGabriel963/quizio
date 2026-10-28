/** A logo or background sent to the bucket and not saved in a theme yet. */
export interface ThemeUpload {
	key: string;
	ownerId: string;
	createdAt: Date;
}

/**
 * The theme files nobody saved yet, kept only to delete them later: the
 * bucket is never listed (spec 043, RN-29). Named apart from the other
 * themes ports, which one store implements in the tests.
 */
export interface ThemeUploadRepository {
	addThemeUpload(upload: ThemeUpload): Promise<void>;
	/** Idempotent; only the owner's own. True when there was one. */
	removeThemeUpload(key: string, ownerId: string): Promise<boolean>;
	/** Removes and returns the keys of up to `limit` uploads created before `before`. */
	takeExpiredThemeUploads(before: Date, limit: number): Promise<string[]>;
}
