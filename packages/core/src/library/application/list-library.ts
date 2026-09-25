import { parseLibrarySearch } from "../domain/library-search";
import type { LibrarySection } from "../domain/library-section";
import {
	type CoverUrlResolver,
	type LibraryItem,
	toLibraryItem,
} from "./library-item";
import type { LibraryQuizQuery } from "./ports/library-quiz-query";

export type { LibraryItem } from "./library-item";

export interface ListLibraryInput {
	ownerId: string;
	section: LibrarySection;
	search?: string | null;
}

export type ListLibrary = (input: ListLibraryInput) => Promise<LibraryItem[]>;

export function createListLibrary(deps: {
	libraryQuizzes: LibraryQuizQuery;
	storage: CoverUrlResolver;
}): ListLibrary {
	return async ({ ownerId, section, search }) => {
		const records = await deps.libraryQuizzes.list({
			ownerId,
			section,
			searchText: parseLibrarySearch(search),
		});

		return records.map((record) => toLibraryItem(record, deps.storage));
	};
}
