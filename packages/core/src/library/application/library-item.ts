import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import type { LibraryQuizRecord } from "./ports/library-quiz-query";

/** A library record as the outside world sees it: no owner, no search or storage internals. */
export type LibraryItem = Omit<
	LibraryQuizRecord,
	"ownerId" | "searchTitle" | "coverImageKey"
> & {
	coverImageUrl: string | null;
};

export type CoverUrlResolver = Pick<ObjectStorage, "getPublicUrl">;

export function toLibraryItem(
	{ ownerId: _, searchTitle: __, coverImageKey, ...record }: LibraryQuizRecord,
	storage: CoverUrlResolver,
): LibraryItem {
	return {
		...record,
		coverImageUrl: coverImageKey ? storage.getPublicUrl(coverImageKey) : null,
	};
}
