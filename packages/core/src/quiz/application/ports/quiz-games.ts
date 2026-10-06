/**
 * What the quiz context asks of the live games (spec 008, RN-34). Wired to the
 * game context in the container, so neither context imports the other.
 */
export interface QuizGames {
	/** Ends the open games of a quiz that is being deleted for good. */
	endGamesOfDeletedQuiz(quizId: string): Promise<void>;
}
