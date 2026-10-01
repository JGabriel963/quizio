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
	getTableColumns,
	isNotNull,
	isNull,
	like,
	type SQL,
	sql,
} from "drizzle-orm";

import {
	question as questionTable,
	quiz as quizTable,
} from "../../schema/quiz";
import type { Database } from "../../types";

/**
 * Real question count per quiz (spec 003, RN-26). Columns are qualified by
 * hand: Drizzle renders them bare inside raw SQL, and a bare "id" in the
 * subquery would resolve to question.id.
 */
const questionCount = sql<number>`(select count(*)::int from ${questionTable} where ${questionTable}.${sql.identifier(questionTable.quizId.name)} = ${quizTable}.${sql.identifier(quizTable.id.name)})`;

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
				.select({ ...getTableColumns(quizTable), questionCount })
				.from(quizTable)
				.where(and(...buildConditions(criteria)))
				.orderBy(desc(newestFirst), asc(quizTable.id));
			const rows = await (criteria.limit === undefined
				? query
				: query.limit(criteria.limit));

			return rows.map(
				({
					createdAt: _createdAt,
					description: _description,
					publishedVersion: _publishedVersion,
					publishedAt: _publishedAt,
					...row
				}) => row,
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
