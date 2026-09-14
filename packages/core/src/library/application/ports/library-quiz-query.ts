import type { QuizStatus } from "../../../quiz/domain/quiz";
import type { QuizVisibility } from "../../../quiz/domain/quiz-details";
import type { LibrarySection } from "../../domain/library-section";

/**
 * Read model of a quiz as the library shows it. The library projects quiz
 * data, so it reuses the quiz context's value types, but never its behavior.
 */
export interface LibraryQuizRecord {
	id: string;
	ownerId: string;
	title: string | null;
	/** Normalized display title, see `normalizeSearchText`. */
	searchTitle: string;
	coverImageKey: string | null;
	visibility: QuizVisibility;
	status: QuizStatus;
	questionCount: number;
	updatedAt: Date;
	trashedAt: Date | null;
}

export interface LibraryQuizCriteria {
	ownerId: string;
	section: LibrarySection;
	/** Already normalized; null lists the whole section. */
	searchText: string | null;
}

/**
 * Contract (spec 001):
 * - only quizzes of `ownerId`;
 * - `recent`: not trashed; `drafts`: not trashed and draft; `trash`: trashed;
 * - `searchText` matches a substring of `searchTitle`;
 * - `recent`/`drafts` ordered by `updatedAt` desc, `trash` by `trashedAt` desc,
 *   ties broken by `id`.
 */
export interface LibraryQuizQuery {
	list(criteria: LibraryQuizCriteria): Promise<LibraryQuizRecord[]>;
}
