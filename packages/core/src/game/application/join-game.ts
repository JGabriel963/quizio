import type { Clock } from "../../shared/application/ports/clock";
import type { IdGenerator } from "../../shared/application/ports/id-generator";
import type { RealtimePublisher } from "../../shared/application/ports/realtime-publisher";
import type { Shuffler } from "../../shared/application/ports/shuffler";
import {
	type Avatar,
	type AvatarInput,
	drawAvatar,
	knownAvatar,
} from "../domain/avatar";
import {
	assertJoinable,
	GAME_MAX_PLAYERS,
	GameFullError,
	NicknameTakenError,
} from "../domain/game";
import { GAME_EVENTS, type PlayerJoinedPayload } from "../domain/game-events";
import { parseNickname } from "../domain/nickname";
import { firstQuestionFor, newPlayer } from "../domain/player";
import { loadLiveGame, publishToGame } from "./game-lifecycle";
import { toLobbyPlayerView } from "./host-game-view";
import type { GameRepository } from "./ports/game-repository";
import type { PlayerRepository } from "./ports/player-repository";

export type JoinGame = (input: {
	gameId: string;
	nickname: string;
	/** The one this browser chose last (spec 028, RN-08); drawn without it. */
	avatar?: AvatarInput | null;
}) => Promise<{
	playerId: string;
	secret: string;
	nickname: string;
	avatar: Avatar;
}>;

/**
 * The nickname step (spec 008, RN-40 to RN-45). The game is checked again:
 * it may have been locked or ended while the player was typing. A game in
 * progress takes players too, each from the question they may answer (spec
 * 012, RN-10, RN-13).
 */
export function createJoinGame(deps: {
	games: GameRepository;
	players: Pick<PlayerRepository, "add">;
	ids: IdGenerator;
	clock: Clock;
	realtime: RealtimePublisher;
	shuffler: Shuffler;
}): JoinGame {
	return async ({ gameId, nickname: rawNickname, avatar: remembered }) => {
		const game = await loadLiveGame(deps, gameId);
		assertJoinable(game);
		const nickname = parseNickname(rawNickname);
		const player = newPlayer({
			id: deps.ids.generate(),
			gameId: game.id,
			nickname,
			secret: deps.ids.generate(),
			firstQuestionIndex: firstQuestionFor(game),
			// One that left the catalog is no error: a new one is drawn (RN-07, RN-08).
			avatar: knownAvatar(remembered ?? null) ?? drawAvatar(deps.shuffler),
			now: deps.clock.now(),
		});
		// The place and the nickname are taken with the insert itself.
		const added = await deps.players.add(player, GAME_MAX_PLAYERS);
		if (added === "full") {
			throw new GameFullError("The game is full");
		}
		if (added === "nicknameTaken") {
			throw new NicknameTakenError("This nickname is taken in the game");
		}
		await publishToGame<PlayerJoinedPayload>(
			deps.realtime,
			game.id,
			GAME_EVENTS.playerJoined,
			{ player: toLobbyPlayerView(game, player) },
		);
		return {
			playerId: player.id,
			secret: player.secret,
			nickname,
			avatar: player.avatar,
		};
	};
}
