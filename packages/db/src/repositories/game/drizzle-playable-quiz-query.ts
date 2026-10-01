import type { PlayableQuizQuery } from "@quizio/core/game/application/ports/playable-quiz-query";
import { eq } from "drizzle-orm";

import { quiz as quizTable } from "../../schema/quiz";
import type { Database } from "../../types";

/** Reads straight from the quiz table: the game context never loads the aggregate. */
export function createDrizzlePlayableQuizQuery(
	db: Database,
): PlayableQuizQuery {
	return {
		async find(quizId) {
			const [row] = await db
				.select({
					id: quizTable.id,
					ownerId: quizTable.ownerId,
					title: quizTable.title,
					version: quizTable.publishedVersion,
					trashedAt: quizTable.trashedAt,
				})
				.from(quizTable)
				.where(eq(quizTable.id, quizId))
				.limit(1);
			if (!row) {
				return null;
			}
			const { trashedAt, ...quiz } = row;
			return { ...quiz, trashed: trashedAt !== null };
		},
	};
}
