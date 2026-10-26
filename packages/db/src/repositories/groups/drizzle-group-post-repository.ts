import type { GroupPostRepository } from "@quizio/core/groups/application/ports/group-post-repository";
import { and, eq } from "drizzle-orm";

import { groupPost, groupPostLike } from "../../schema/groups";
import type { Database } from "../../types";

/** The feed's writes (spec 038; ADR 0016). */
export function createDrizzleGroupPostRepository(
	db: Database,
): GroupPostRepository {
	return {
		async createPost(post) {
			// The partial unique index keeps an assignment once per group (RN-28).
			const created = await db
				.insert(groupPost)
				.values(post)
				.onConflictDoNothing()
				.returning({ id: groupPost.id });
			return created.length > 0 ? "created" : "taken";
		},

		async findPost(groupId, postId) {
			const [row] = await db
				.select()
				.from(groupPost)
				.where(and(eq(groupPost.id, postId), eq(groupPost.groupId, groupId)))
				.limit(1);
			return row ?? null;
		},

		async deletePost(postId) {
			// The likes go by the foreign key's cascade.
			await db.delete(groupPost).where(eq(groupPost.id, postId));
		},

		async setLike(postId, userId, liked, at) {
			if (liked) {
				await db
					.insert(groupPostLike)
					.values({ postId, userId, createdAt: at })
					.onConflictDoNothing();
				return;
			}
			await db
				.delete(groupPostLike)
				.where(
					and(
						eq(groupPostLike.postId, postId),
						eq(groupPostLike.userId, userId),
					),
				);
		},
	};
}
