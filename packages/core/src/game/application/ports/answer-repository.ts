import type { Answer } from "../../domain/answer";

export interface AnswerRepository {
	/**
	 * Inserts; "alreadyAnswered" when the player has an answer for the question
	 * (spec 009, RN-17).
	 */
	add(answer: Answer): Promise<"added" | "alreadyAnswered">;
	find(
		gameId: string,
		questionIndex: number,
		playerId: string,
	): Promise<Answer | null>;
	listByQuestion(gameId: string, questionIndex: number): Promise<Answer[]>;
	countByQuestion(gameId: string, questionIndex: number): Promise<number>;
	/**
	 * Sum of the points of each player over the questions up to
	 * `questionIndex`; who has no answer is left out (spec 010).
	 */
	totalsThrough(
		gameId: string,
		questionIndex: number,
	): Promise<{ playerId: string; total: number }[]>;
	/** A player's answers in the game, by question. */
	listByPlayer(gameId: string, playerId: string): Promise<Answer[]>;
}
