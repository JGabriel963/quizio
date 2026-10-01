import type { Clock } from "../../shared/application/ports/clock";
import { requireOwnedGame } from "../domain/game";
import { loadGame } from "./game-lifecycle";
import { type HostLobbyView, toHostLobbyView } from "./host-lobby-view";
import type { GameRepository } from "./ports/game-repository";
import type { PlayerRepository } from "./ports/player-repository";

export type GetHostLobby = (input: {
	ownerId: string;
	gameId: string;
}) => Promise<HostLobbyView>;

/** An ended game is still shown to its host, with the reason (spec 008, RN-32). */
export function createGetHostLobby(deps: {
	games: GameRepository;
	players: Pick<PlayerRepository, "listActive">;
	clock: Clock;
}): GetHostLobby {
	return async ({ ownerId, gameId }) => {
		const game = requireOwnedGame(await loadGame(deps, gameId), ownerId);
		return toHostLobbyView(game, await deps.players.listActive(game.id));
	};
}
