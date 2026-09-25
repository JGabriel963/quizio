import type {
	LibraryQuizCriteria,
	LibraryQuizQuery,
} from "@quizio/core/library/application/ports/library-quiz-query";
import {
	and,
	asc,
	count as countRows,
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

function buildConditions({
	ownerId,
	section,
	searchText,
}: LibraryQuizCriteria): SQL[] {
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
	return conditions;
}

export function createDrizzleLibraryQuizQuery(db: Database): LibraryQuizQuery {
	return {
		async list(criteria) {
			const newestFirst =
				criteria.section === "trash"
					? quizTable.trashedAt
					: quizTable.updatedAt;
			const query = db
				.select()
				.from(quizTable)
				.where(and(...buildConditions(criteria)))
				.orderBy(desc(newestFirst), asc(quizTable.id));
			const rows = await (criteria.limit === undefined
				? query
				: query.limit(criteria.limit));

			// questionCount becomes a real count when questions exist (spec 003).
			return rows.map(
				({ createdAt: _createdAt, description: _description, ...row }) => ({
					...row,
					questionCount: 0,
				}),
			);
		},

		async count(criteria) {
			const [row] = await db
				.select({ value: countRows() })
				.from(quizTable)
				.where(and(...buildConditions(criteria)));

			return row?.value ?? 0;
		},
	};
}
