import type { GroupPost } from "../../domain/group-post";

/** A post with what the feed shows of it (spec 038, RN-14, RN-18). */
export interface GroupPostRecord extends GroupPost {
	authorName: string;
	likeCount: number;
	likedByViewer: boolean;
}

/** Where the next page of the feed starts (spec 036, RN-18). */
export interface GroupFeedCursor {
	createdAt: Date;
	id: string;
}

/** Read model of the feed, with the authors' names from their accounts. */
export interface GroupFeedQuery {
	/**
	 * Newest first, by (created_at, id). With a page, at most `limit` posts
	 * after the cursor; without one, all of them.
	 */
	listPosts(
		groupId: string,
		viewerId: string,
		page?: { limit: number; after: GroupFeedCursor | null },
	): Promise<GroupPostRecord[]>;
	/**
	 * The posts whose assignment is still open at `now` (not ended, its
	 * deadline ahead, as `isAssignmentOpen` says), newest first, at most
	 * `limit`: the Atribuições tab reads these, so neither messages nor
	 * assignments that are over take an open one's place (audit L9).
	 */
	listOpenAssignmentPosts(
		groupId: string,
		viewerId: string,
		now: Date,
		limit: number,
	): Promise<GroupPostRecord[]>;
	/** One post of the group, for its own page (spec 040, RN-19). */
	findPostRecord(
		groupId: string,
		postId: string,
		viewerId: string,
	): Promise<GroupPostRecord | null>;
	likeCount(postId: string): Promise<number>;
	/** For "Configurar seu grupo" (spec 038, RN-29). */
	feedStats(groupId: string): Promise<{ posts: number; assignments: number }>;
	/** Which of these groups already have the assignment (spec 038, RN-26). */
	groupsWithAssignment(
		gameId: string,
		groupIds: readonly string[],
	): Promise<string[]>;
}
