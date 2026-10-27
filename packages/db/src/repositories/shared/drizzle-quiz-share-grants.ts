import type { QuizShareGrants } from "@quizio/core/shared/application/ports/quiz-share-grants";
import { and, eq } from "drizzle-orm";

import { groupMember, groupSharedQuiz } from "../../schema/groups";
import type { Database } from "../../types";

/**
 * A member of a group the quiz is shared in may use it (spec 037; ADR 0018).
 * The membership is read now, so leaving the group takes the grant away.
 */
export function createDrizzleQuizShareGrants(db: Database): QuizShareGrants {
	return {
		async canUse(userId, quizId) {
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
