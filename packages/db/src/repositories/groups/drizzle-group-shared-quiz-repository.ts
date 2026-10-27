import type { GroupSharedQuizRepository } from "@quizio/core/groups/application/ports/group-shared-quiz-repository";
import { and, eq } from "drizzle-orm";

import { groupPost, groupSharedQuiz } from "../../schema/groups";
import type { Database } from "../../types";
import { toGroupPostRow } from "./drizzle-group-post-repository";

/** Thrown inside the transaction to undo it when a quiz is already shared. */
class AlreadySharedSignal extends Error {}

/** The writes of "Compartilhado" (spec 037; ADR 0018). */
export function createDrizzleGroupSharedQuizRepository(
	db: Database,
): GroupSharedQuizRepository {
	return {
		async shareWithPost(shares, post) {
			// The unique index decides a quiz shared twice at the same moment;
			// the shares and their post go in together or not at all (RN-06).
			try {
				await db.transaction(async (tx) => {
					const inserted = await tx
						.insert(groupSharedQuiz)
						.values(shares.map((share) => ({ ...share })))
						.onConflictDoNothing()
						.returning({ id: groupSharedQuiz.id });
					if (inserted.length < shares.length) {
						throw new AlreadySharedSignal();
					}
					await tx.insert(groupPost).values(toGroupPostRow(post));
				});
				return "created";
			} catch (error) {
				if (error instanceof AlreadySharedSignal) {
					return "alreadyShared";
				}
				throw error;
			}
		},

		async findSharedQuiz(groupId, quizId) {
			const [row] = await db
				.select()
				.from(groupSharedQuiz)
				.where(
					and(
						eq(groupSharedQuiz.groupId, groupId),
						eq(groupSharedQuiz.quizId, quizId),
					),
				)
				.limit(1);
			return row ?? null;
		},

		async removeSharedQuiz(id) {
			await db.delete(groupSharedQuiz).where(eq(groupSharedQuiz.id, id));
		},

		async sharedQuizIdsOf(groupId) {
			const rows = await db
				.select({ quizId: groupSharedQuiz.quizId })
				.from(groupSharedQuiz)
				.where(eq(groupSharedQuiz.groupId, groupId));
			return rows.map((row) => row.quizId);
		},
	};
}
