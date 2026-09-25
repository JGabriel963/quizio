import { HOME_RECENT_QUIZ_LIMIT } from "../domain/home";
import {
	type CoverUrlResolver,
	type LibraryItem,
	toLibraryItem,
} from "./library-item";
import type {
	LibraryQuizCriteria,
	LibraryQuizQuery,
} from "./ports/library-quiz-query";

export interface HomeOverview {
	/** Newest first, at most `HOME_RECENT_QUIZ_LIMIT` (spec 002, RN-15). */
	quizzes: LibraryItem[];
	/** Every quiz of the creator outside the trash, for the "see all" link (RN-17). */
	totalQuizCount: number;
}

export interface GetHomeOverviewInput {
	ownerId: string;
}

export type GetHomeOverview = (
	input: GetHomeOverviewInput,
) => Promise<HomeOverview>;

export function createGetHomeOverview(deps: {
	libraryQuizzes: LibraryQuizQuery;
	storage: CoverUrlResolver;
}): GetHomeOverview {
	return async ({ ownerId }) => {
		// The dashboard shows the same section as the library's "Recentes", so the
		// trash is excluded by the section itself (RN-20).
		const criteria: LibraryQuizCriteria = {
			ownerId,
			section: "recent",
			searchText: null,
		};
		const [records, totalQuizCount] = await Promise.all([
			deps.libraryQuizzes.list({ ...criteria, limit: HOME_RECENT_QUIZ_LIMIT }),
			deps.libraryQuizzes.count(criteria),
		]);

		return {
			quizzes: records.map((record) => toLibraryItem(record, deps.storage)),
			totalQuizCount,
		};
	};
}
