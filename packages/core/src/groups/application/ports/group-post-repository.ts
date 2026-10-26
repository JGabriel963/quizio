import type { GroupPost } from "../../domain/group-post";

/** The feed's writes (spec 038; ADR 0016). */
export interface GroupPostRepository {
	/** "taken" when the assignment is already in that group (RN-28). */
	createPost(post: GroupPost): Promise<"created" | "taken">;
	findPost(groupId: string, postId: string): Promise<GroupPost | null>;
	/** Its likes go with it (RN-21). */
	deletePost(postId: string): Promise<void>;
	/** Idempotent: liking twice is one like (RN-17, RN-18). */
	setLike(
		postId: string,
		userId: string,
		liked: boolean,
		at: Date,
	): Promise<void>;
}
