import type { Clock } from "../../shared/application/ports/clock";
import type { RealtimePublisher } from "../../shared/application/ports/realtime-publisher";
import { requireOwnedGame } from "../domain/game";
import { closeGame, loadGame } from "./game-lifecycle";
import type { GameRepository } from "./ports/game-repository";

export type EndGame = (input: {
	ownerId: string;
	gameId: string;
}) => Promise<void>;

/** The host closes the game; doing it twice is harmless (spec 008, RN-31). */
export function createEndGame(deps: {
	games: GameRepository;
	clock: Clock;
	realtime: RealtimePublisher;
}): EndGame {
	return async ({ ownerId, gameId }) => {
		const game = requireOwnedGame(await loadGame(deps, gameId), ownerId);
		await closeGame(deps, game, "host");
	};
}
