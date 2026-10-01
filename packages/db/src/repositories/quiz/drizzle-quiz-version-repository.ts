import type { QuizVersionRepository } from "@quizio/core/quiz/application/ports/quiz-version-repository";
import {
	parseVersionQuestions,
	type QuizVersion,
} from "@quizio/core/quiz/domain/quiz-version";
import { and, asc, eq } from "drizzle-orm";

import { quizVersion as versionTable } from "../../schema/quiz";
import type { Database } from "../../types";

/** The core owns the shape of the snapshot, as with question content. */
function toVersion(row: typeof versionTable.$inferSelect): QuizVersion {
	return {
		quizId: row.quizId,
		number: row.number,
		questions: parseVersionQuestions(row.questions),
		createdAt: row.createdAt,
	};
}

export function createDrizzleQuizVersionRepository(
	db: Database,
): QuizVersionRepository {
	return {
		async find(quizId, number) {
			const [row] = await db
				.select()
				.from(versionTable)
				.where(
					and(eq(versionTable.quizId, quizId), eq(versionTable.number, number)),
				)
				.limit(1);
			return row ? toVersion(row) : null;
		},

		async listByQuiz(quizId) {
			const rows = await db
				.select()
				.from(versionTable)
				.where(eq(versionTable.quizId, quizId))
				.orderBy(asc(versionTable.number));
			return rows.map(toVersion);
		},

		async save(version) {
			const { quizId, number, ...fields } = version;
			await db
				.insert(versionTable)
				.values({ quizId, number, ...fields })
				.onConflictDoUpdate({
					target: [versionTable.quizId, versionTable.number],
					set: fields,
				});
		},

		async deleteAllOfQuiz(quizId) {
			await db.delete(versionTable).where(eq(versionTable.quizId, quizId));
		},
	};
}
