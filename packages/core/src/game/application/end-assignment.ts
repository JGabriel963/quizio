import type { Clock } from "../../shared/application/ports/clock";
import type { RealtimePublisher } from "../../shared/application/ports/realtime-publisher";
import { requireAssignment, requireOwnedGame } from "../domain/game";
import { closeGame, loadGame } from "./game-lifecycle";
import type { GameRepository } from "./ports/game-repository";

export type EndAssignment = (input: {
	ownerId: string;
	gameId: string;
}) => Promise<void>;

/**
 * "Encerrar agora" (spec 029, RN-39): the assignment ends at once, for good;
 * doing it twice keeps the first instant.
 */
export function createEndAssignment(deps: {
	games: GameRepository;
	clock: Clock;
	realtime: RealtimePublisher;
}): EndAssignment {
	return async ({ ownerId, gameId }) => {
		const game = requireAssignment(
			requireOwnedGame(await loadGame(deps, gameId), ownerId),
		);
		await closeGame(deps, game, "host");
	};
}
