import type { Question } from "../../domain/question";

/**
 * Questions of a quiz, kept in list order (spec 003). Structural edits
 * rewrite the whole list; autosave touches a single question.
 */
export interface QuestionRepository {
	/** The quiz's questions in position order. */
	listByQuiz(quizId: string): Promise<Question[]>;
	countByQuiz(quizId: string): Promise<number>;
	/**
	 * Atomically replaces the quiz's list: drops questions not in `questions`,
	 * inserts or updates the rest and stores each index as its position.
	 * A question id owned by another quiz is ignored, never taken over.
	 */
	saveList(quizId: string, questions: readonly Question[]): Promise<void>;
	/** Updates an existing question's content without touching its position. */
	saveQuestion(quizId: string, question: Question): Promise<void>;
	deleteAllOfQuiz(quizId: string): Promise<void>;
}
