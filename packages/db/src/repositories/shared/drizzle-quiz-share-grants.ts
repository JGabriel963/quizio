import type { QuizShareGrants } from "@quizio/core/shared/application/ports/quiz-share-grants";
import { and, eq, isNotNull, isNull } from "drizzle-orm";

import { groupMember, groupSharedQuiz } from "../../schema/groups";
import { quiz as quizTable } from "../../schema/quiz";
import type { Database } from "../../types";

/**
 * A member of a group the quiz is shared in may use it (spec 037; ADR 0018),
 * and so may anybody when it is public, published and out of the trash (spec
 * 039, RN-33; ADR 0019). Both are read now, so leaving the group or making
 * the quiz private takes the grant away.
 */
export function createDrizzleQuizShareGrants(db: Database): QuizShareGrants {
	return {
		async canUse(userId, quizId) {
			const [publicQuiz] = await db
				.select({ id: quizTable.id })
				.from(quizTable)
				.where(
					and(
						eq(quizTable.id, quizId),
						eq(quizTable.visibility, "public"),
						isNull(quizTable.trashedAt),
						isNotNull(quizTable.publishedVersion),
					),
				)
				.limit(1);
			if (publicQuiz) {
				return true;
			}
			const [row] = await db
				.select({ quizId: groupSharedQuiz.quizId })
				.from(groupSharedQuiz)
				.innerJoin(
					groupMember,
					and(
						eq(groupMember.groupId, groupSharedQuiz.groupId),
						eq(groupMember.userId, userId),
					),
				)
				.where(eq(groupSharedQuiz.quizId, quizId))
				.limit(1);
			return row !== undefined;
		},
	};
}
