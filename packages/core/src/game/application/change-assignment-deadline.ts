import type { Clock } from "../../shared/application/ports/clock";
import { changeAssignmentDeadline } from "../domain/assignment";
import {
	GameEndedError,
	requireAssignment,
	requireOwnedGame,
} from "../domain/game";
import { loadGame } from "./game-lifecycle";
import type { GameRepository } from "./ports/game-repository";

export type ChangeAssignmentDeadline = (input: {
	ownerId: string;
	gameId: string;
	deadline: Date;
}) => Promise<void>;

/**
 * "Alterar prazo" (spec 029, RN-36 to RN-38): earlier or later, while the
 * assignment is open. Only the deadline is written, and only if nothing
 * ended the assignment meanwhile.
 */
export function createChangeAssignmentDeadline(deps: {
	games: GameRepository;
	clock: Clock;
	maxDeadlineDays: number;
}): ChangeAssignmentDeadline {
	return async ({ ownerId, gameId, deadline }) => {
		const game = requireAssignment(
			requireOwnedGame(await loadGame(deps, gameId), ownerId),
		);
		changeAssignmentDeadline(
			game,
			deadline,
			deps.clock.now(),
			deps.maxDeadlineDays,
		);
		if (!(await deps.games.saveDeadline(game.id, deadline))) {
			throw new GameEndedError("The assignment has ended");
		}
	};
}
