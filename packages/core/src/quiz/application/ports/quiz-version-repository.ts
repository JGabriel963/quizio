import type { QuizVersion } from "../../domain/quiz-version";

/**
 * Playable versions of the quizzes (spec 006). A version is written once and
 * read as a whole; older versions stay for the games and reports that point
 * to them.
 */
export interface QuizVersionRepository {
	/** The quiz's version of that number, or null. */
	find(quizId: string, number: number): Promise<QuizVersion | null>;
	/**
	 * Inserts the version. A version of the same quiz and number is replaced:
	 * it is what a publish that failed halfway left behind.
	 */
	save(version: QuizVersion): Promise<void>;
	/** Every stored version of the quiz, oldest first. */
	listByQuiz(quizId: string): Promise<QuizVersion[]>;
	deleteAllOfQuiz(quizId: string): Promise<void>;
}
