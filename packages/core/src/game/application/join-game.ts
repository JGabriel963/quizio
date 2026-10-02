import type { Clock } from "../../shared/application/ports/clock";
import type { IdGenerator } from "../../shared/application/ports/id-generator";
import type { RealtimePublisher } from "../../shared/application/ports/realtime-publisher";
import {
	assertJoinable,
	GAME_MAX_PLAYERS,
	GameFullError,
	NicknameTakenError,
} from "../domain/game";
import { GAME_EVENTS, type PlayerJoinedPayload } from "../domain/game-events";
import { parseNickname } from "../domain/nickname";
import { firstQuestionFor, newPlayer } from "../domain/player";
import { loadGame, publishToGame } from "./game-lifecycle";
import { toLobbyPlayerView } from "./host-game-view";
import type { GameRepository } from "./ports/game-repository";
import type { PlayerRepository } from "./ports/player-repository";

export type JoinGame = (input: {
	gameId: string;
	nickname: string;
}) => Promise<{ playerId: string; secret: string; nickname: string }>;

/**
 * The nickname step (spec 008, RN-40 to RN-45). The game is checked again:
 * it may have been locked or ended while the player was typing. A game in
 * progress takes players too, each from the question they may answer (spec
 * 012, RN-10, RN-13).
 */
export function createJoinGame(deps: {
	games: GameRepository;
	players: Pick<PlayerRepository, "countActive" | "add">;
	ids: IdGenerator;
	clock: Clock;
	realtime: RealtimePublisher;
}): JoinGame {
	return async ({ gameId, nickname: rawNickname }) => {
		const game = await loadGame(deps, gameId);
		assertJoinable(game);
		const nickname = parseNickname(rawNickname);
		if ((await deps.players.countActive(game.id)) >= GAME_MAX_PLAYERS) {
			throw new GameFullError("The game is full");
		}

		const player = newPlayer({
			id: deps.ids.generate(),
			gameId: game.id,
			nickname,
			secret: deps.ids.generate(),
			firstQuestionIndex: firstQuestionFor(game),
			now: deps.clock.now(),
		});
		if ((await deps.players.add(player)) === "nicknameTaken") {
			throw new NicknameTakenError("This nickname is taken in the game");
		}
		await publishToGame<PlayerJoinedPayload>(
			deps.realtime,
			game.id,
			GAME_EVENTS.playerJoined,
			{ player: toLobbyPlayerView(player) },
		);
		return { playerId: player.id, secret: player.secret, nickname };
	};
}
