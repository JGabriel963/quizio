import type { GroupFeedQuery } from "@quizio/core/groups/application/ports/group-feed-query";
import { and, count, desc, eq, inArray, isNotNull, or, sql } from "drizzle-orm";

import { user } from "../../schema/auth";
import { groupPost, groupPostLike } from "../../schema/groups";
import type { Database } from "../../types";
import { toGroupPost } from "./drizzle-group-post-repository";

/** The feed with the authors' names and the likes, by pages (specs 036, 038). */
export function createDrizzleGroupFeedQuery(db: Database): GroupFeedQuery {
	return {
		async listPosts(groupId, viewerId, page) {
			const after = page?.after ?? null;
			const query = db
				.select({ post: groupPost, authorName: user.name })
				.from(groupPost)
				.innerJoin(user, eq(user.id, groupPost.authorId))
				.where(
					and(
						eq(groupPost.groupId, groupId),
						// Keyset: what comes after (created_at, id) in the feed's order.
						after
							? or(
									sql`${groupPost.createdAt} < ${after.createdAt}`,
									and(
										eq(groupPost.createdAt, after.createdAt),
										sql`${groupPost.id} < ${after.id}`,
									),
								)
							: undefined,
					),
				)
				.orderBy(desc(groupPost.createdAt), desc(groupPost.id));
			const rows = await (page ? query.limit(page.limit) : query);
			if (rows.length === 0) {
				return [];
			}
			const postIds = rows.map((row) => row.post.id);
			const likes = await db
				.select({ postId: groupPostLike.postId, userId: groupPostLike.userId })
				.from(groupPostLike)
				.where(inArray(groupPostLike.postId, postIds));
			return rows.map(({ post, authorName }) => {
				const ofPost = likes.filter((like) => like.postId === post.id);
				return {
					...toGroupPost(post),
					authorName,
					likeCount: ofPost.length,
					likedByViewer: ofPost.some((like) => like.userId === viewerId),
				};
			});
		},

		async likeCount(postId) {
			const [row] = await db
				.select({ total: count() })
				.from(groupPostLike)
				.where(eq(groupPostLike.postId, postId));
			return row?.total ?? 0;
		},

		async feedStats(groupId) {
			const [posts] = await db
				.select({ total: count() })
				.from(groupPost)
				.where(eq(groupPost.groupId, groupId));
			const [assignments] = await db
				.select({ total: count() })
				.from(groupPost)
				.where(
					and(eq(groupPost.groupId, groupId), isNotNull(groupPost.gameId)),
				);
			return {
				posts: posts?.total ?? 0,
				assignments: assignments?.total ?? 0,
			};
		},

		async groupsWithAssignment(gameId, groupIds) {
			if (groupIds.length === 0) {
				return [];
			}
			const rows = await db
				.select({ groupId: groupPost.groupId })
				.from(groupPost)
				.where(
					and(
						eq(groupPost.gameId, gameId),
						inArray(groupPost.groupId, [...groupIds]),
					),
				);
			return rows.map((row) => row.groupId);
		},
	};
}
