import type { Clock } from "../../shared/application/ports/clock";
import type { RealtimePublisher } from "../../shared/application/ports/realtime-publisher";
import {
	assertGameOpen,
	GameNotFoundError,
	requireOwnedGame,
} from "../domain/game";
import { GAME_EVENTS, type PlayerRemovedPayload } from "../domain/game-events";
import { removePlayer } from "../domain/player";
import { loadGame, publishToGame } from "./game-lifecycle";
import type { GameRepository } from "./ports/game-repository";
import type { PlayerRepository } from "./ports/player-repository";

export type RemovePlayer = (input: {
	ownerId: string;
	gameId: string;
	playerId: string;
}) => Promise<void>;

/**
 * The host takes a player out. The player's row stays, which keeps the
 * nickname blocked in the game (spec 008, RN-29, RN-30).
 */
export function createRemovePlayer(deps: {
	games: GameRepository;
	players: Pick<PlayerRepository, "findById" | "save">;
	clock: Clock;
	realtime: RealtimePublisher;
}): RemovePlayer {
	return async ({ ownerId, gameId, playerId }) => {
		const game = requireOwnedGame(await loadGame(deps, gameId), ownerId);
		assertGameOpen(game);
		const player = await deps.players.findById(playerId);
		if (!player || player.gameId !== game.id) {
			throw new GameNotFoundError("Player not found");
		}

		const removed = removePlayer(player, deps.clock.now());
		if (removed === player) {
			return;
		}
		await deps.players.save(removed);
		await publishToGame<PlayerRemovedPayload>(
			deps.realtime,
			game.id,
			GAME_EVENTS.playerRemoved,
			{ playerId: player.id },
		);
	};
}
