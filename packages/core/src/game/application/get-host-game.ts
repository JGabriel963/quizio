import { requireOwnedGame } from "../domain/game";
import { loadLiveGame } from "./game-lifecycle";
import {
	type HostGameView,
	type HostGameViewDeps,
	loadHostGameView,
} from "./host-game-view";
import type { GameRepository } from "./ports/game-repository";

export type GetHostGame = (input: {
	ownerId: string;
	gameId: string;
}) => Promise<HostGameView>;

/**
 * What the host's screen shows, whatever the game is doing: the lobby, the
 * stage of a game in progress with the time really left (spec 009, RN-32), or
 * a game that is over, with the reason (spec 008, RN-32).
 */
export function createGetHostGame(
	deps: HostGameViewDeps & { games: GameRepository },
): GetHostGame {
	return async ({ ownerId, gameId }) => {
		const game = requireOwnedGame(await loadLiveGame(deps, gameId), ownerId);
		return loadHostGameView(deps, game);
	};
}
