import type { QuizRepository } from "@quizio/core/quiz/application/ports/quiz-repository";
import type { Quiz } from "@quizio/core/quiz/domain/quiz";
import { quizSearchText } from "@quizio/core/quiz/domain/quiz-details";
import { eq } from "drizzle-orm";

import { quiz as quizTable } from "../../schema/quiz";
import type { Database } from "../../types";

export function createDrizzleQuizRepository(db: Database): QuizRepository {
	return {
		async findById(id) {
			const [row] = await db
				.select()
				.from(quizTable)
				.where(eq(quizTable.id, id))
				.limit(1);
			return row ? toQuiz(row) : null;
		},

		async save(quiz) {
			const { id, ...fields } = quiz;
			const changes = { ...fields, searchTitle: quizSearchText(quiz.title) };
			await db
				.insert(quizTable)
				.values({ id, ...changes })
				.onConflictDoUpdate({ target: quizTable.id, set: changes });
		},

		async delete(id) {
			await db.delete(quizTable).where(eq(quizTable.id, id));
		},
	};
}

function toQuiz({
	searchTitle: _searchTitle,
	...quiz
}: typeof quizTable.$inferSelect): Quiz {
	return quiz;
}
