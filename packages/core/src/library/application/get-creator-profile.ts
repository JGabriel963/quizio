import {
	type PersonView,
	personView,
} from "../../shared/application/person-view";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { ProfileNotFoundError } from "../domain/profile-errors";
import type { CreatorProfileQuery } from "./ports/creator-profile-query";

/** A public quiz's card on the profile (spec 039, RN-30). */
export interface PublicQuizCardView {
	quizId: string;
	title: string;
	coverUrl: string | null;
	questionCount: number;
	participants: number;
}

export interface CreatorProfileView {
	creator: PersonView;
	/** "Editar perfil" and the owner's empty text (RN-31, RN-32). */
	isOwner: boolean;
	/** Quizzes, Jogos and Participantes (RN-29). */
	totals: { quizzes: number; games: number; participants: number };
	quizzes: PublicQuizCardView[];
}

export type GetCreatorProfile = (input: {
	viewerId: string;
	userId: string;
}) => Promise<CreatorProfileView>;

/** Seen by anybody with an account (spec 039, RN-27, RN-28). */
export function createGetCreatorProfile(deps: {
	creatorProfiles: CreatorProfileQuery;
	storage: ObjectStorage;
}): GetCreatorProfile {
	return async ({ viewerId, userId }) => {
		const creator = await deps.creatorProfiles.creator(userId);
		if (!creator) {
			throw new ProfileNotFoundError(`No profile ${userId}`);
		}
		const cards = await deps.creatorProfiles.publicQuizzes(userId);
		return {
			creator: personView(creator, deps.storage),
			isOwner: viewerId === userId,
			totals: {
				quizzes: cards.length,
				games: cards.reduce((total, card) => total + card.games, 0),
				participants: cards.reduce(
					(total, card) => total + card.participants,
					0,
				),
			},
			quizzes: cards.map((card) => ({
				quizId: card.quizId,
				title: card.title,
				coverUrl: card.coverImageKey
					? deps.storage.getPublicUrl(card.coverImageKey)
					: null,
				questionCount: card.questionCount,
				participants: card.participants,
			})),
		};
	};
}
