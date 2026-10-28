import type { QuizRepository } from "@quizio/core/quiz/application/ports/quiz-repository";
import type { Quiz } from "@quizio/core/quiz/domain/quiz";
import { quizSearchText } from "@quizio/core/quiz/domain/quiz-details";
import { knownThemeId } from "@quizio/core/shared/domain/theme";
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

		async markEdited(id, { updatedAt, hasUnpublishedChanges }) {
			await db
				.update(quizTable)
				.set({ updatedAt, hasUnpublishedChanges })
				.where(eq(quizTable.id, id));
		},

		async saveVisibility(id, { visibility, updatedAt }) {
			await db
				.update(quizTable)
				.set({ visibility, updatedAt })
				.where(eq(quizTable.id, id));
		},

		async saveTheme(id, { themeId, customThemeId, updatedAt }) {
			await db
				.update(quizTable)
				.set({ themeId, customThemeId, updatedAt })
				.where(eq(quizTable.id, id));
		},

		async listIdsByOwner(ownerId) {
			const rows = await db
				.select({ id: quizTable.id })
				.from(quizTable)
				.where(eq(quizTable.ownerId, ownerId));
			return rows.map((row) => row.id);
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
	// A row still "public" (spec 001) reads as private (spec 039, RN-25).
	return {
		...quiz,
		visibility: quiz.visibility === "public" ? "public" : "private",
		themeId: knownThemeId(quiz.themeId),
	};
}
