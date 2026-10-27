import type { Question } from "../../quiz/domain/question";
import {
	type PersonView,
	personView,
} from "../../shared/application/person-view";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { PublicQuizNotFoundError } from "../domain/profile-errors";
import type { CreatorProfileQuery } from "./ports/creator-profile-query";

/**
 * The page of a public quiz for whoever is not its owner: the page of the
 * shared quiz outside the group (spec 039, RN-33; spec 037, RN-16).
 */
export interface PublicQuizView {
	quizId: string;
	title: string;
	description: string;
	coverUrl: string | null;
	owner: PersonView;
	games: number;
	participants: number;
	/** With the right answers: "Mostrar respostas" is only the screen's. */
	questions: Question[];
	/** Each question image's key → its public URL. */
	imageUrls: Record<string, string>;
	/** The owner goes to the quiz's own page instead. */
	ownedByViewer: boolean;
}

export type GetPublicQuiz = (input: {
	viewerId: string;
	ownerId: string;
	quizId: string;
}) => Promise<PublicQuizView>;

export function createGetPublicQuiz(deps: {
	creatorProfiles: CreatorProfileQuery;
	storage: ObjectStorage;
}): GetPublicQuiz {
	return async ({ viewerId, ownerId, quizId }) => {
		const [creator, detail] = await Promise.all([
			deps.creatorProfiles.creator(ownerId),
			deps.creatorProfiles.publicQuiz(ownerId, quizId),
		]);
		if (!creator || !detail) {
			throw new PublicQuizNotFoundError(`No public quiz ${quizId}`);
		}
		const imageUrls: Record<string, string> = {};
		for (const question of detail.questions) {
			if (question.image) {
				imageUrls[question.image.key] = deps.storage.getPublicUrl(
					question.image.key,
				);
			}
		}
		return {
			quizId: detail.quizId,
			title: detail.title,
			description: detail.description,
			coverUrl: detail.coverImageKey
				? deps.storage.getPublicUrl(detail.coverImageKey)
				: null,
			owner: personView(creator, deps.storage),
			games: detail.games,
			participants: detail.participants,
			questions: detail.questions,
			imageUrls,
			ownedByViewer: viewerId === ownerId,
		};
	};
}
