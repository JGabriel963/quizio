import type { Answer, Correctness } from "../../domain/answer";

/** A new grade for one player's answer, from the host's review (spec 031, RN-30). */
export interface AnswerRegrade {
	playerId: string;
	correctness: Correctness;
	points: number;
}

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
	/**
	 * Rewrites the correctness and the points of these players' answers to one
	 * question, marking them reviewed (spec 031, RN-30); nothing else changes.
	 */
	regrade(
		gameId: string,
		questionIndex: number,
		regrades: readonly AnswerRegrade[],
		reviewedAt: Date,
	): Promise<void>;
}
