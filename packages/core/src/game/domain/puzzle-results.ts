import type { Answer } from "./answer";
import type { GameQuestion } from "./game-question";

/**
 * A puzzle's results (spec 033, RN-26): the right order, and how many got it
 * right or wrong. Who did not answer counts in neither.
 */
export interface PuzzleResults {
	order: string[];
	correct: number;
	wrong: number;
}

export function puzzleResultsOf(
	question: GameQuestion,
	answers: readonly Pick<Answer, "correctness">[],
): PuzzleResults {
	const correct = answers.filter(
		(answer) => answer.correctness === "correct",
	).length;
	return {
		order: [...question.correctOrder],
		correct,
		wrong: answers.length - correct,
	};
}
