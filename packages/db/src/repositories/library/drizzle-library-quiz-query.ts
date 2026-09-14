import type { LibraryQuizQuery } from "@quizio/core/library/application/ports/library-quiz-query";
import {
	and,
	asc,
	desc,
	eq,
	isNotNull,
	isNull,
	like,
	type SQL,
} from "drizzle-orm";

import { quiz as quizTable } from "../../schema/quiz";
import type { Database } from "../../types";

/** Escapes LIKE wildcards so user input matches literally (Postgres' default escape is `\`). */
const escapeLikePattern = (text: string) =>
	text.replace(/[\\%_]/g, (character) => `\\${character}`);

export function createDrizzleLibraryQuizQuery(db: Database): LibraryQuizQuery {
	return {
		async list({ ownerId, section, searchText }) {
			const conditions: SQL[] = [
				eq(quizTable.ownerId, ownerId),
				section === "trash"
					? isNotNull(quizTable.trashedAt)
					: isNull(quizTable.trashedAt),
			];
			if (section === "drafts") {
				conditions.push(eq(quizTable.status, "draft"));
			}
			if (searchText) {
				// search_title is stored normalized, so a plain LIKE is accent- and case-insensitive.
				conditions.push(
					like(quizTable.searchTitle, `%${escapeLikePattern(searchText)}%`),
				);
			}

			const newestFirst =
				section === "trash" ? quizTable.trashedAt : quizTable.updatedAt;
			const rows = await db
				.select()
				.from(quizTable)
				.where(and(...conditions))
				.orderBy(desc(newestFirst), asc(quizTable.id));

			// questionCount becomes a real count when questions exist (spec 002).
			return rows.map(
				({ createdAt: _createdAt, description: _description, ...row }) => ({
					...row,
					questionCount: 0,
				}),
			);
		},
	};
}
