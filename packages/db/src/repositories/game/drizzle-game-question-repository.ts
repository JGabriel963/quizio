import type { GameQuestionRepository } from "@quizio/core/game/application/ports/game-question-repository";
import { parseStoredGameQuestion } from "@quizio/core/game/domain/game-question";
import { and, eq } from "drizzle-orm";

import { gameQuestion as questionTable } from "../../schema/game";
import type { Database } from "../../types";

export function createDrizzleGameQuestionRepository(
	db: Database,
): GameQuestionRepository {
	return {
		async saveAll(gameId, questions) {
			if (questions.length === 0) {
				return;
			}
			// Two requests starting the same game write the same copy: the first stays.
			await db
				.insert(questionTable)
				.values(
					questions.map((question) => ({
						gameId,
						index: question.index,
						question,
					})),
				)
				.onConflictDoNothing();
		},

		async find(gameId, index) {
			const [row] = await db
				.select({ question: questionTable.question })
				.from(questionTable)
				.where(
					and(eq(questionTable.gameId, gameId), eq(questionTable.index, index)),
				)
				.limit(1);
			return row ? parseStoredGameQuestion(row.question) : null;
		},
	};
}
