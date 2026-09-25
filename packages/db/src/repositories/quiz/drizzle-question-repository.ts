import type { QuestionRepository } from "@quizio/core/quiz/application/ports/question-repository";
import type { Question } from "@quizio/core/quiz/domain/question";
import { and, asc, count, eq, notInArray, sql } from "drizzle-orm";

import { question as questionTable } from "../../schema/quiz";
import type { Database } from "../../types";

export function createDrizzleQuestionRepository(
	db: Database,
): QuestionRepository {
	const ofQuiz = (quizId: string) => eq(questionTable.quizId, quizId);

	return {
		async listByQuiz(quizId) {
			const rows = await db
				.select({
					id: questionTable.id,
					type: questionTable.type,
					text: questionTable.text,
				})
				.from(questionTable)
				.where(ofQuiz(quizId))
				.orderBy(asc(questionTable.position), asc(questionTable.id));
			return rows satisfies Question[];
		},

		async countByQuiz(quizId) {
			const [row] = await db
				.select({ value: count() })
				.from(questionTable)
				.where(ofQuiz(quizId));
			return row?.value ?? 0;
		},

		async saveList(quizId, questions) {
			const ids = questions.map((question) => question.id);
			await db.transaction(async (tx) => {
				await tx
					.delete(questionTable)
					.where(
						ids.length > 0
							? and(ofQuiz(quizId), notInArray(questionTable.id, ids))
							: ofQuiz(quizId),
					);
				if (questions.length === 0) {
					return;
				}
				await tx
					.insert(questionTable)
					.values(
						questions.map((question, position) => ({
							...question,
							quizId,
							position,
						})),
					)
					.onConflictDoUpdate({
						target: questionTable.id,
						set: {
							position: sql.raw(`excluded.${questionTable.position.name}`),
							type: sql.raw(`excluded.${questionTable.type.name}`),
							text: sql.raw(`excluded.${questionTable.text.name}`),
						},
						// Ids come back from clients on undo: an id owned by another
						// quiz must never be taken over.
						setWhere: ofQuiz(quizId),
					});
			});
		},

		async saveQuestion(quizId, question) {
			await db
				.update(questionTable)
				.set({ type: question.type, text: question.text })
				.where(and(ofQuiz(quizId), eq(questionTable.id, question.id)));
		},

		async deleteAllOfQuiz(quizId) {
			await db.delete(questionTable).where(ofQuiz(quizId));
		},
	};
}
