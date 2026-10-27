import { loadPhotoUrls } from "../../shared/application/person-view";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import type { ProfilePhotoKeys } from "../../shared/application/ports/profile-photo-keys";
import {
	SHARED_QUIZZES_PAGE_SIZE,
	type SharedQuizSort,
} from "../domain/shared-quiz";
import { type GroupStoreDeps, requireMembership } from "./load-group";
import type { SharedQuizReads } from "./ports/shared-quiz-reads";
import {
	type SharedQuizCardView,
	sharedQuizCardViewOf,
} from "./shared-quiz-view";

export type ListSharedQuizzes = (input: {
	userId: string;
	groupId: string;
	sort: SharedQuizSort;
	/** "Mostrar mais" asks for 20 more each time (RN-15). */
	limit?: number;
}) => Promise<{ items: SharedQuizCardView[]; hasMore: boolean }>;

/** The "Compartilhado" tab (spec 037, RN-14, RN-15). */
export function createListSharedQuizzes(
	deps: GroupStoreDeps & {
		sharedQuizReads: SharedQuizReads;
		storage: ObjectStorage;
		profilePhotos: ProfilePhotoKeys;
	},
): ListSharedQuizzes {
	return async ({ sort, limit = SHARED_QUIZZES_PAGE_SIZE, ...input }) => {
		const { membership } = await requireMembership(deps, input);
		const cards = await deps.sharedQuizReads.listSharedQuizzes(
			input.groupId,
			sort,
			limit + 1,
		);
		const page = cards.slice(0, limit);
		const photoUrlOf = await loadPhotoUrls(
			page.map((card) => card.ownerId),
			deps,
		);
		return {
			items: page.map((card) =>
				sharedQuizCardViewOf(card, deps.storage, membership, photoUrlOf),
			),
			hasMore: cards.length > limit,
		};
	};
}
