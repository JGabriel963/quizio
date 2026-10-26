import type { GroupPost } from "../../domain/group-post";

/** A post with what the feed shows of it (spec 038, RN-14, RN-18). */
export interface GroupPostRecord extends GroupPost {
	authorName: string;
	likeCount: number;
	likedByViewer: boolean;
}

/** Read model of the feed, with the authors' names from their accounts. */
export interface GroupFeedQuery {
	/** Newest first (RN-13). */
	listPosts(groupId: string, viewerId: string): Promise<GroupPostRecord[]>;
	likeCount(postId: string): Promise<number>;
	/** For "Configurar seu grupo" (RN-29). */
	feedStats(groupId: string): Promise<{ posts: number; assignments: number }>;
	/** Which of these groups already have the assignment (RN-26). */
	groupsWithAssignment(
		gameId: string,
		groupIds: readonly string[],
	): Promise<string[]>;
}
