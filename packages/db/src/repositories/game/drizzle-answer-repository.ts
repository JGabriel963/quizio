import type { AnswerRepository } from "@quizio/core/game/application/ports/answer-repository";
import type { Answer } from "@quizio/core/game/domain/answer";
import { and, asc, count as countRows, eq, lte, sum } from "drizzle-orm";

import { gameAnswer as answerTable } from "../../schema/game";
import type { Database } from "../../types";

function toAnswer(row: typeof answerTable.$inferSelect): Answer {
	return row;
}

const ofQuestion = (gameId: string, questionIndex: number) =>
	and(
		eq(answerTable.gameId, gameId),
		eq(answerTable.questionIndex, questionIndex),
	);

export function createDrizzleAnswerRepository(db: Database): AnswerRepository {
	return {
		async add(answer) {
			// Two taps racing: the key lets one answer in (spec 009, RN-17).
			const inserted = await db
				.insert(answerTable)
				.values(answer)
				.onConflictDoNothing()
				.returning({ playerId: answerTable.playerId });
			return inserted.length > 0 ? "added" : "alreadyAnswered";
		},

		async find(gameId, questionIndex, playerId) {
			const [row] = await db
				.select()
				.from(answerTable)
				.where(
					and(
						ofQuestion(gameId, questionIndex),
						eq(answerTable.playerId, playerId),
					),
				)
				.limit(1);
			return row ? toAnswer(row) : null;
		},

		async listByQuestion(gameId, questionIndex) {
			const rows = await db
				.select()
				.from(answerTable)
				.where(ofQuestion(gameId, questionIndex))
				.orderBy(asc(answerTable.receivedAt), asc(answerTable.playerId));
			return rows.map(toAnswer);
		},

		async countByQuestion(gameId, questionIndex) {
			const [row] = await db
				.select({ total: countRows() })
				.from(answerTable)
				.where(ofQuestion(gameId, questionIndex));
			return row?.total ?? 0;
		},

		async totalsThrough(gameId, questionIndex) {
			const rows = await db
				.select({
					playerId: answerTable.playerId,
					total: sum(answerTable.points),
				})
				.from(answerTable)
				.where(
					and(
						eq(answerTable.gameId, gameId),
						lte(answerTable.questionIndex, questionIndex),
					),
				)
				.groupBy(answerTable.playerId);
			// `sum` comes back as text, and null only for a group with no rows.
			return rows.map(({ playerId, total }) => ({
				playerId,
				total: Number(total ?? 0),
			}));
		},

		async listByPlayer(gameId, playerId) {
			const rows = await db
				.select()
				.from(answerTable)
				.where(
					and(
						eq(answerTable.gameId, gameId),
						eq(answerTable.playerId, playerId),
					),
				)
				.orderBy(asc(answerTable.questionIndex));
			return rows.map(toAnswer);
		},
	};
}
