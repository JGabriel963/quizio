import type { GroupPostRepository } from "@quizio/core/groups/application/ports/group-post-repository";
import type { GroupPost } from "@quizio/core/groups/domain/group-post";
import { and, eq, isNotNull } from "drizzle-orm";

import { groupPost, groupPostLike, groupUpload } from "../../schema/groups";
import type { Database } from "../../types";

type GroupPostRow = typeof groupPost.$inferSelect;

/** The row with its four file columns as one value (spec 036). */
export function toGroupPost(row: GroupPostRow): GroupPost {
	const { fileType, fileKey, fileName, fileSizeBytes, ...post } = row;
	return {
		...post,
		file:
			fileType && fileKey && fileName !== null && fileSizeBytes !== null
				? {
						type: fileType,
						key: fileKey,
						name: fileName,
						sizeBytes: fileSizeBytes,
					}
				: null,
	};
}

export function toGroupPostRow({
	file,
	...post
}: GroupPost): typeof groupPost.$inferInsert {
	return {
		...post,
		fileType: file?.type ?? null,
		fileKey: file?.key ?? null,
		fileName: file?.name ?? null,
		fileSizeBytes: file?.sizeBytes ?? null,
	};
}

/** The feed's writes (specs 036 and 038; ADRs 0016 and 0017). */
export function createDrizzleGroupPostRepository(
	db: Database,
): GroupPostRepository {
	return {
		async createPost(post) {
			// The partial unique index keeps an assignment once per group (RN-28).
			const created = await db
				.insert(groupPost)
				.values(toGroupPostRow(post))
				.onConflictDoNothing()
				.returning({ id: groupPost.id });
			return created.length > 0 ? "created" : "taken";
		},

		async createMessageFromUpload(post, upload) {
			// Taking the row and inserting the post together: of two publishes
			// of one upload, only the first finds the row.
			return db.transaction(async (tx) => {
				const [taken] = await tx
					.delete(groupUpload)
					.where(
						and(
							eq(groupUpload.key, upload.key),
							eq(groupUpload.uploaderId, upload.uploaderId),
							eq(groupUpload.groupId, post.groupId),
						),
					)
					.returning();
				if (!taken) {
					return "missing";
				}
				await tx.insert(groupPost).values(
					toGroupPostRow({
						...post,
						file: {
							type: taken.fileType,
							key: taken.key,
							name: taken.fileName,
							sizeBytes: taken.fileSizeBytes,
						},
					}),
				);
				return "created";
			});
		},

		async findPost(groupId, postId) {
			const [row] = await db
				.select()
				.from(groupPost)
				.where(and(eq(groupPost.id, postId), eq(groupPost.groupId, groupId)))
				.limit(1);
			return row ? toGroupPost(row) : null;
		},

		async deletePost(postId) {
			// The likes go by the foreign key's cascade.
			const [row] = await db
				.delete(groupPost)
				.where(eq(groupPost.id, postId))
				.returning();
			return row ? toGroupPost(row) : null;
		},

		async fileKeysOfGroup(groupId) {
			const rows = await db
				.select({ key: groupPost.fileKey })
				.from(groupPost)
				.where(
					and(eq(groupPost.groupId, groupId), isNotNull(groupPost.fileKey)),
				);
			return rows.flatMap((row) => (row.key ? [row.key] : []));
		},

		async fileKeysByAuthor(authorId) {
			const rows = await db
				.select({ key: groupPost.fileKey })
				.from(groupPost)
				.where(
					and(eq(groupPost.authorId, authorId), isNotNull(groupPost.fileKey)),
				);
			return rows.flatMap((row) => (row.key ? [row.key] : []));
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
