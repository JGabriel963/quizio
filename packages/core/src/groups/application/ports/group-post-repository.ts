import type { GroupPost } from "../../domain/group-post";

/** The feed's writes (specs 036 and 038; ADRs 0016 and 0017). */
export interface GroupPostRepository {
	/** "taken" when the assignment is already in that group (spec 038, RN-28). */
	createPost(post: GroupPost): Promise<"created" | "taken">;
	/**
	 * Takes the uploader's pending upload in that group and creates the post
	 * with its file, in one transaction: an upload is posted at most once.
	 * "missing" when there is no such upload (spec 036, RN-21).
	 */
	createMessageFromUpload(
		post: Omit<GroupPost, "file">,
		upload: { key: string; uploaderId: string },
	): Promise<"created" | "missing">;
	findPost(groupId: string, postId: string): Promise<GroupPost | null>;
	/** Its likes go with it; returns what was deleted, for its file. */
	deletePost(postId: string): Promise<GroupPost | null>;
	/** The files posted in the group, to delete them with it. */
	fileKeysOfGroup(groupId: string): Promise<string[]>;
	/** The files the user posted in any group, to delete them with the account (spec 039). */
	fileKeysByAuthor(authorId: string): Promise<string[]>;
	/** Idempotent: liking twice is one like (spec 038, RN-17, RN-18). */
	setLike(
		postId: string,
		userId: string,
		liked: boolean,
		at: Date,
	): Promise<void>;
}
