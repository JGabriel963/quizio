import type {
	LibraryQuizCriteria,
	LibraryQuizQuery,
	LibraryQuizRecord,
} from "../application/ports/library-quiz-query";
import type { LibrarySection } from "../domain/library-section";

/** Executable version of the `LibraryQuizQuery` contract, over any record source. */
export class InMemoryLibraryQuizQuery implements LibraryQuizQuery {
	constructor(private readonly source: () => readonly LibraryQuizRecord[]) {}

	async list({
		ownerId,
		section,
		searchText,
	}: LibraryQuizCriteria): Promise<LibraryQuizRecord[]> {
		return this.source()
			.filter((record) => record.ownerId === ownerId)
			.filter((record) => isInSection(record, section))
			.filter(
				(record) =>
					searchText === null || record.searchTitle.includes(searchText),
			)
			.toSorted(
				section === "trash"
					? newestFirst((record) => record.trashedAt)
					: newestFirst((record) => record.updatedAt),
			);
	}
}

function isInSection(record: LibraryQuizRecord, section: LibrarySection) {
	switch (section) {
		case "recent":
			return record.trashedAt === null;
		case "drafts":
			return record.trashedAt === null && record.status === "draft";
		case "trash":
			return record.trashedAt !== null;
	}
}

function newestFirst(dateOf: (record: LibraryQuizRecord) => Date | null) {
	return (a: LibraryQuizRecord, b: LibraryQuizRecord) =>
		(dateOf(b)?.getTime() ?? 0) - (dateOf(a)?.getTime() ?? 0) ||
		a.id.localeCompare(b.id);
}
