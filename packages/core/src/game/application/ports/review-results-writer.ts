import type { Game } from "../../domain/game";
import type { StageRef } from "../../domain/game-progress";
import type { AnswerRegrade } from "./answer-repository";

/**
 * What "Enviar" of a review writes (spec 031, RN-30, RN-30a): the game moves
 * on from its results and the marked answers get their new grades, both or
 * neither. A failure in the middle never leaves a game that moved on with the
 * old points, nor new points on a game another request already moved.
 */
export interface ReviewResultsWriter {
	/** False, writing nothing, when the game had already left `from`. */
	advanceAndRegrade(input: {
		next: Game;
		from: StageRef;
		questionIndex: number;
		regrades: AnswerRegrade[];
		reviewedAt: Date;
	}): Promise<boolean>;
}
