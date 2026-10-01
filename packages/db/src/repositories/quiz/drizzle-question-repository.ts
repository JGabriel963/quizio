import type { QuestionRepository } from "@quizio/core/quiz/application/ports/question-repository";
import {
	DEFAULT_TIME_LIMIT_SECONDS,
	parseStoredContent,
	QUESTION_POINTS,
	type Question,
	storedContent,
	TIME_LIMITS_SECONDS,
} from "@quizio/core/quiz/domain/question";
import { and, asc, count, eq, notInArray, sql } from "drizzle-orm";

import { question as questionTable } from "../../schema/quiz";
import type { Database } from "../../types";

type QuestionRow = Pick<
	typeof questionTable.$inferSelect,
	"id" | "type" | "text" | "timeLimitSeconds" | "points" | "content"
>;

/** Tolerant on read: a value the core no longer accepts falls back to the default. */
function toQuestion(row: QuestionRow): Question {
	return {
		id: row.id,
		text: row.text,
		timeLimitSeconds: (TIME_LIMITS_SECONDS as readonly number[]).includes(
			row.timeLimitSeconds,
		)
			? (row.timeLimitSeconds as Question["timeLimitSeconds"])
			: DEFAULT_TIME_LIMIT_SECONDS,
		points: QUESTION_POINTS.includes(row.points) ? row.points : "standard",
		...parseStoredContent(row.type, row.content),
	};
}

/** Columns written for a question; content is the type-specific jsonb. */
function toColumns(question: Question) {
	return {
		type: question.type,
		text: question.text,
		timeLimitSeconds: question.timeLimitSeconds,
		points: question.points,
		content: storedContent(question),
	};
}

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
					timeLimitSeconds: questionTable.timeLimitSeconds,
					points: questionTable.points,
					content: questionTable.content,
				})
				.from(questionTable)
				.where(ofQuiz(quizId))
				.orderBy(asc(questionTable.position), asc(questionTable.id));
			return rows.map(toQuestion);
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
							id: question.id,
							...toColumns(question),
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
							timeLimitSeconds: sql.raw(
								`excluded.${questionTable.timeLimitSeconds.name}`,
							),
							points: sql.raw(`excluded.${questionTable.points.name}`),
							content: sql.raw(`excluded.${questionTable.content.name}`),
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
				.set(toColumns(question))
				.where(and(ofQuiz(quizId), eq(questionTable.id, question.id)));
		},

		async deleteAllOfQuiz(quizId) {
			await db.delete(questionTable).where(ofQuiz(quizId));
		},
	};
}
