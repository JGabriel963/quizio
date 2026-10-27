import type {
	PersonView,
	PhotoUrlOf,
} from "../../shared/application/person-view";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import type { GroupMember } from "../domain/group-member";
import { canUnshare } from "../domain/group-permissions";
import type { SharedQuizCard } from "./ports/shared-quiz-reads";

/**
 * A shared quiz as the screens draw it: the post's card, the tab's card and
 * row (spec 037, RN-09, RN-15).
 */
export interface SharedQuizCardView {
	sharedQuizId: string;
	quizId: string;
	title: string;
	coverUrl: string | null;
	questionCount: number;
	visibility: SharedQuizCard["visibility"];
	owner: PersonView;
	sharedAt: Date;
	/** "N partidas" (RN-15). */
	games: number;
	/** Iniciar opens the quiz's own page for its owner (RN-10). */
	ownedByViewer: boolean;
	/** "Remover do grupo": who shared it and the admin (RN-11). */
	canUnshare: boolean;
}

export function sharedQuizCardViewOf(
	card: SharedQuizCard,
	storage: ObjectStorage,
	viewer: Pick<GroupMember, "userId" | "role">,
	photoUrlOf: PhotoUrlOf,
): SharedQuizCardView {
	return {
		sharedQuizId: card.sharedQuizId,
		quizId: card.quizId,
		title: card.title,
		coverUrl: card.coverImageKey
			? storage.getPublicUrl(card.coverImageKey)
			: null,
		questionCount: card.questionCount,
		visibility: card.visibility,
		owner: {
			userId: card.ownerId,
			name: card.ownerName,
			photoUrl: photoUrlOf(card.ownerId),
		},
		sharedAt: card.sharedAt,
		games: card.games,
		ownedByViewer: card.ownerId === viewer.userId,
		canUnshare: canUnshare(card, viewer),
	};
}
