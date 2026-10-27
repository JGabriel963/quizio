import type { Question } from "../../../quiz/domain/question";

/** A creator as the profile reads them (spec 039, RN-27). */
export interface ProfileCreator {
	userId: string;
	name: string;
	photoKey: string | null;
}

/**
 * A public quiz on the profile: published, out of the trash, from the
 * playable version in force (RN-28). Games and participants count started
 * games of any host (RN-29), as the shared quiz does (spec 037, RN-16).
 */
export interface PublicQuizCard {
	quizId: string;
	title: string;
	coverImageKey: string | null;
	questionCount: number;
	games: number;
	participants: number;
}

export interface PublicQuizDetail extends PublicQuizCard {
	description: string;
	/** The playable version's questions, in order (spec 037, RN-17). */
	questions: Question[];
}

/** Read model over the account, quiz, version and game tables. */
export interface CreatorProfileQuery {
	creator(userId: string): Promise<ProfileCreator | null>;
	/** Newest publication first (RN-28). */
	publicQuizzes(ownerId: string): Promise<PublicQuizCard[]>;
	/** Null when the quiz is not the owner's, not public or not playable (RN-34). */
	publicQuiz(ownerId: string, quizId: string): Promise<PublicQuizDetail | null>;
}
