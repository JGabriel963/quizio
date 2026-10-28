import type { Question } from "../../../quiz/domain/question";
import type { QuizVisibility } from "../../../quiz/domain/quiz-details";
import type { ThemeId } from "../../../shared/domain/theme";
import type { ThemeLook } from "../../../shared/domain/theme-look";
import type { SharedQuizSort } from "../../domain/shared-quiz";

/**
 * A shared quiz as the group reads it, from the quiz's playable version in
 * force, the owner's account and the games played with it (spec 037; ADR
 * 0018). Only alive shares: published and out of the owner's trash (RN-23).
 */
export interface SharedQuizCard {
	sharedQuizId: string;
	quizId: string;
	title: string;
	coverImageKey: string | null;
	questionCount: number;
	visibility: QuizVisibility;
	ownerId: string;
	ownerName: string;
	sharedById: string;
	sharedAt: Date;
	/** Games and assignments that started with the quiz, any host (RN-15). */
	games: number;
}

/** The page of the shared quiz (RN-16). */
export interface SharedQuizDetail extends SharedQuizCard {
	description: string;
	sharedByName: string;
	/** Players of those games. */
	participants: number;
	/** The playable version's questions, in order (RN-17). */
	questions: Question[];
	/** The quiz's theme, for the screen that opens a game (spec 042, RN-13). */
	themeId: ThemeId;
	/** The look of the owner's custom theme, or null (spec 043, RN-25). */
	customTheme: ThemeLook | null;
}

/** Read model over the quiz, game and account tables. */
export interface SharedQuizReads {
	/** Of these, the ids of `ownerId`'s quizzes that can be played (RN-02). */
	shareableQuizIds(
		ownerId: string,
		quizIds: readonly string[],
	): Promise<string[]>;
	/** One more than `limit` tells there is another page. */
	listSharedQuizzes(
		groupId: string,
		sort: SharedQuizSort,
		limit: number,
	): Promise<SharedQuizCard[]>;
	/** The feed's cards, by share id; gone or trashed ones are left out. */
	sharedQuizCards(sharedQuizIds: readonly string[]): Promise<SharedQuizCard[]>;
	sharedQuizDetail(
		groupId: string,
		quizId: string,
	): Promise<SharedQuizDetail | null>;
}
