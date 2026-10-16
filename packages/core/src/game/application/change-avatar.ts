import type { Clock } from "../../shared/application/ports/clock";
import type { RealtimePublisher } from "../../shared/application/ports/realtime-publisher";
import { type Avatar, type AvatarInput, parseAvatar } from "../domain/avatar";
import { GameNotFoundError } from "../domain/game";
import { type AvatarChangedPayload, GAME_EVENTS } from "../domain/game-events";
import { changePlayerAvatar, hasPlayerSecret } from "../domain/player";
import { loadGame, publishToGame } from "./game-lifecycle";
import type { GameRepository } from "./ports/game-repository";
import type { PlayerRepository } from "./ports/player-repository";

export type ChangeAvatar = (input: {
	gameId: string;
	playerId: string;
	secret: string;
	avatar: AvatarInput;
}) => Promise<{ avatar: Avatar }>;

/**
 * A tap in the avatar editor (spec 028, RN-12 to RN-14): the avatar changes
 * at once and the host's lobby is told. Whether the player still waits is
 * read before the write; a change that crosses the start of the question by
 * a moment is accepted, because the avatar weighs on nothing of the game.
 */
export function createChangeAvatar(deps: {
	games: GameRepository;
	players: Pick<PlayerRepository, "findById" | "saveAvatar">;
	clock: Clock;
	realtime: RealtimePublisher;
}): ChangeAvatar {
	return async ({ gameId, playerId, secret, avatar: input }) => {
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
		const avatar = parseAvatar(input);
		changePlayerAvatar(game, player, avatar);
		await deps.players.saveAvatar(player.id, avatar);
		await publishToGame<AvatarChangedPayload>(
			deps.realtime,
			game.id,
			GAME_EVENTS.avatarChanged,
			{ playerId: player.id, avatar },
		);
		return { avatar };
	};
}
