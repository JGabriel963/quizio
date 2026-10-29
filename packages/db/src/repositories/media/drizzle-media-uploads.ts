import type {
	MediaUploadRepository,
	MediaUsage,
} from "@quizio/core/media/application/ports/media-upload-repository";
import { and, asc, eq, inArray, lt, sql } from "drizzle-orm";

import { profilePhoto } from "../../schema/identity";
import { mediaUpload } from "../../schema/media";
import { question, quiz, quizVersion } from "../../schema/quiz";
import type { Database } from "../../types";

export function createDrizzleMediaUploadRepository(
	db: Database,
): MediaUploadRepository {
	return {
		async addMediaUpload(upload) {
			await db.insert(mediaUpload).values(upload).onConflictDoNothing();
		},

		async takeExpiredMediaUploads(before, limit) {
			// One statement: two sweeps at the same time never take the same row.
			const oldest = db
				.select({ key: mediaUpload.key })
				.from(mediaUpload)
				.where(lt(mediaUpload.createdAt, before))
				.orderBy(asc(mediaUpload.createdAt))
				.limit(limit);
			const taken = await db
				.delete(mediaUpload)
				.where(inArray(mediaUpload.key, oldest))
				.returning({ key: mediaUpload.key, createdAt: mediaUpload.createdAt });
			return taken
				.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
				.map(({ key }) => key);
		},
	};
}

/**
 * What points at a file of `media/{ownerId}/` or `profiles/{ownerId}/`: only
 * the owner's quizzes and profile can, since a copy of somebody else's quiz
 * gets copies of its files (audit L4).
 */
export function createDrizzleMediaUsage(db: Database): MediaUsage {
	async function found(rows: Promise<unknown[]>): Promise<boolean> {
		return (await rows).length > 0;
	}

	return {
		async isMediaInUse(key) {
			const [prefix, ownerId] = key.split("/");
			if (!ownerId) {
				return false;
			}
			if (prefix === "profiles") {
				return found(
					db
						.select({ userId: profilePhoto.userId })
						.from(profilePhoto)
						.where(
							and(eq(profilePhoto.userId, ownerId), eq(profilePhoto.key, key)),
						),
				);
			}
			const ofOwner = eq(quiz.ownerId, ownerId);
			// The key as it is written inside a version's JSON, quotes included,
			// so a key that only starts the same is not taken for it.
			const quoted = JSON.stringify(key);
			return (
				(await found(
					db
						.select({ id: quiz.id })
						.from(quiz)
						.where(and(ofOwner, eq(quiz.coverImageKey, key)))
						.limit(1),
				)) ||
				(await found(
					db
						.select({ id: question.id })
						.from(question)
						.innerJoin(quiz, eq(quiz.id, question.quizId))
						.where(and(ofOwner, sql`${question.image} ->> 'key' = ${key}`))
						.limit(1),
				)) ||
				found(
					db
						.select({ quizId: quizVersion.quizId })
						.from(quizVersion)
						.innerJoin(quiz, eq(quiz.id, quizVersion.quizId))
						.where(
							and(
								ofOwner,
								sql`strpos(${quizVersion.questions}::text, ${quoted}) > 0`,
							),
						)
						.limit(1),
				)
			);
		},
	};
}
