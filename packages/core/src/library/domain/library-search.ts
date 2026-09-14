import { normalizeSearchText } from "../../shared/domain/search-text";

/** Turns raw search input into normalized text, or null when there is nothing to search. */
export function parseLibrarySearch(
	raw: string | null | undefined,
): string | null {
	const searchText = normalizeSearchText(raw ?? "");
	return searchText === "" ? null : searchText;
}
