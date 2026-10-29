import type {
	GroupFeedQuery,
	GroupPostRecord,
} from "@quizio/core/groups/application/ports/group-feed-query";
import {
	and,
	count,
	desc,
	eq,
	exists,
	gt,
	inArray,
	isNotNull,
	isNull,
	or,
	type SQL,
	sql,
} from "drizzle-orm";

import { user } from "../../schema/auth";
import { game } from "../../schema/game";
import { groupPost, groupPostLike } from "../../schema/groups";
import type { Database } from "../../types";
import { toGroupPost } from "./drizzle-group-post-repository";

/** The feed with the authors' names and the likes, by pages (specs 036, 038). */
export function createDrizzleGroupFeedQuery(db: Database): GroupFeedQuery {
	/** The posts with their authors' names and likes, newest first. */
	async function records(
		where: SQL | undefined,
		viewerId: string,
		limit?: number,
	): Promise<GroupPostRecord[]> {
		const query = db
			.select({ post: groupPost, authorName: user.name })
			.from(groupPost)
			.innerJoin(user, eq(user.id, groupPost.authorId))
			.where(where)
			.orderBy(desc(groupPost.createdAt), desc(groupPost.id));
		const rows = await (limit === undefined ? query : query.limit(limit));
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
	}

	return {
		async listPosts(groupId, viewerId, page) {
			const after = page?.after ?? null;
			return records(
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
				viewerId,
				page?.limit,
			);
		},

		async listOpenAssignmentPosts(groupId, viewerId, now, limit) {
			// The groups' `isAssignmentOpen`, read where the limit is applied.
			const open = db
				.select({ id: game.id })
				.from(game)
				.where(
					and(
						eq(game.id, groupPost.gameId),
						eq(game.mode, "assignment"),
						isNull(game.endedAt),
						gt(game.expiresAt, now),
					),
				);
			return records(
				and(
					eq(groupPost.groupId, groupId),
					isNotNull(groupPost.gameId),
					exists(open),
				),
				viewerId,
				limit,
			);
		},

		async findPostRecord(groupId, postId, viewerId) {
			const [record] = await records(
				and(eq(groupPost.groupId, groupId), eq(groupPost.id, postId)),
				viewerId,
				1,
			);
			return record ?? null;
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
