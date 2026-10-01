import type { Clock } from "../../shared/application/ports/clock";
import { GameNotFoundError, isGameOpen } from "../domain/game";
import { hasPlayerSecret, isActivePlayer } from "../domain/player";
import { loadGame } from "./game-lifecycle";
import type { GameRepository } from "./ports/game-repository";
import type { PlayerRepository } from "./ports/player-repository";

/** `removed` wins over `ended`: the player was told to leave first. */
export type PlayerSessionStatus = "waiting" | "removed" | "ended";

export interface PlayerSessionView {
	gameId: string;
	nickname: string;
	status: PlayerSessionStatus;
}

export type GetPlayerSession = (input: {
	gameId: string;
	playerId: string;
	secret: string;
}) => Promise<PlayerSessionView>;

/**
 * What the player's device should be showing, asked with the pair it got when
 * joining (ADR 0009). It is how a device that missed an event catches up
 * (spec 008, RN-44, RN-46).
 */
export function createGetPlayerSession(deps: {
	games: GameRepository;
	players: Pick<PlayerRepository, "findById">;
	clock: Clock;
}): GetPlayerSession {
	return async ({ gameId, playerId, secret }) => {
		const game = await loadGame(deps, gameId);
		const player = await deps.players.findById(playerId);
		if (
			!game ||
			!player ||
			player.gameId !== game.id ||
			!hasPlayerSecret(player, secret)
		) {
			throw new GameNotFoundError("Player session not found");
		}
		return {
			gameId: game.id,
			nickname: player.nickname,
			status: !isActivePlayer(player)
				? "removed"
				: isGameOpen(game)
					? "waiting"
					: "ended",
		};
	};
}
