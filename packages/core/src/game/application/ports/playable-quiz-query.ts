import type { Question } from "../../../quiz/domain/question";
import type { ThemeId } from "../../../shared/domain/theme";

/** What the game context needs to know about a quiz to host it (spec 008). */
export interface PlayableQuiz {
	id: string;
	ownerId: string;
	title: string | null;
	/** Number of the playable version in force; null for a draft. */
	version: number | null;
	trashed: boolean;
	/** Copied into every game made from it (spec 042, RN-10). */
	themeId: ThemeId;
}

/** Read model over the quiz context: the game never loads the quiz aggregate. */
export interface PlayableQuizQuery {
	find(quizId: string): Promise<PlayableQuiz | null>;
	/** The questions of that playable version, in order; empty if it is gone. */
	questions(quizId: string, version: number): Promise<Question[]>;
}
