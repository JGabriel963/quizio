import type { Clock } from "../../shared/application/ports/clock";
import type { RealtimePublisher } from "../../shared/application/ports/realtime-publisher";
import type { GameEndReason, GameMode } from "../domain/game";
import { closeGame, settleGame } from "./game-lifecycle";
import type { GameRepository } from "./ports/game-repository";

export type EndGamesOfQuiz = (input: {
	quizId: string;
	reason: GameEndReason;
	/** Every mode when absent: a deleted quiz ends its assignments too (spec 029, RN-42). */
	modes?: readonly GameMode[];
}) => Promise<void>;

/**
 * Ends whatever game of the quiz is still open: when a new one replaces it
 * (spec 008, RN-07) or the quiz is deleted for good (RN-34).
 */
export function createEndGamesOfQuiz(deps: {
	games: GameRepository;
	clock: Clock;
	realtime: RealtimePublisher;
}): EndGamesOfQuiz {
	return async ({ quizId, reason, modes }) => {
		for (const stored of await deps.games.listUnendedByQuiz(quizId, modes)) {
			await closeGame(deps, await settleGame(deps, stored), reason);
		}
	};
}
