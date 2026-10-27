import type { PlayableQuizQuery } from "@quizio/core/game/application/ports/playable-quiz-query";
import { parseVersionQuestions } from "@quizio/core/quiz/domain/quiz-version";
import { knownThemeId } from "@quizio/core/shared/domain/theme";
import { and, eq } from "drizzle-orm";

import {
	quiz as quizTable,
	quizVersion as versionTable,
} from "../../schema/quiz";
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
					themeId: quizTable.themeId,
				})
				.from(quizTable)
				.where(eq(quizTable.id, quizId))
				.limit(1);
			if (!row) {
				return null;
			}
			const { trashedAt, themeId, ...quiz } = row;
			return {
				...quiz,
				trashed: trashedAt !== null,
				themeId: knownThemeId(themeId),
			};
		},

		async questions(quizId, version) {
			const [row] = await db
				.select({ questions: versionTable.questions })
				.from(versionTable)
				.where(
					and(
						eq(versionTable.quizId, quizId),
						eq(versionTable.number, version),
					),
				)
				.limit(1);
			return row ? parseVersionQuestions(row.questions) : [];
		},
	};
}
