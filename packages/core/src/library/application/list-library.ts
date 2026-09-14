import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { parseLibrarySearch } from "../domain/library-search";
import type { LibrarySection } from "../domain/library-section";
import type {
	LibraryQuizQuery,
	LibraryQuizRecord,
} from "./ports/library-quiz-query";

export type LibraryItem = Omit<
	LibraryQuizRecord,
	"ownerId" | "searchTitle" | "coverImageKey"
> & {
	coverImageUrl: string | null;
};

export interface ListLibraryInput {
	ownerId: string;
	section: LibrarySection;
	search?: string | null;
}

export type ListLibrary = (input: ListLibraryInput) => Promise<LibraryItem[]>;

export function createListLibrary(deps: {
	libraryQuizzes: LibraryQuizQuery;
	storage: Pick<ObjectStorage, "getPublicUrl">;
}): ListLibrary {
	return async ({ ownerId, section, search }) => {
		const records = await deps.libraryQuizzes.list({
			ownerId,
			section,
			searchText: parseLibrarySearch(search),
		});

		return records.map(
			({ ownerId: _, searchTitle: __, coverImageKey, ...item }) => ({
				...item,
				coverImageUrl: coverImageKey
					? deps.storage.getPublicUrl(coverImageKey)
					: null,
			}),
		);
	};
}
