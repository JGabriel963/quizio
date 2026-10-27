import type { GroupPostFile } from "../../domain/group-file";

/** A file sent to the bucket and not posted yet (spec 036; ADR 0017). */
export interface GroupUpload {
	key: string;
	groupId: string;
	uploaderId: string;
	file: Omit<GroupPostFile, "key">;
	createdAt: Date;
}

/**
 * The group files nobody posted yet, kept only to delete them later: the
 * bucket is never listed (spec 036, RN-21). Named apart from the other
 * groups ports, which one store implements in the tests.
 */
export interface GroupUploadRepository {
	addUpload(upload: GroupUpload): Promise<void>;
	/** Idempotent; only the uploader's own. True when there was one. */
	removeUpload(key: string, uploaderId: string): Promise<boolean>;
	/** Removes and returns the keys of up to `limit` uploads created before `before`. */
	takeExpiredUploads(before: Date, limit: number): Promise<string[]>;
	/** The group's pending keys, to delete them with the group. */
	uploadKeysOfGroup(groupId: string): Promise<string[]>;
}
