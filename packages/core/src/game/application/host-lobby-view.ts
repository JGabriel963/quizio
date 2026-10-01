import type { Game, GameEndReason, GameStatus } from "../domain/game";
import type { Player } from "../domain/player";

export interface LobbyPlayerView {
	id: string;
	nickname: string;
}

/** Everything the host's lobby screen shows (spec 008, RN-14 to RN-17). */
export interface HostLobbyView {
	gameId: string;
	quizId: string;
	title: string;
	pin: string;
	status: GameStatus;
	endReason: GameEndReason | null;
	locked: boolean;
	/** Active players, in order of arrival. */
	players: LobbyPlayerView[];
}

export function toLobbyPlayerView(player: Player): LobbyPlayerView {
	return { id: player.id, nickname: player.nickname };
}

export function toHostLobbyView(
	game: Game,
	players: readonly Player[],
): HostLobbyView {
	return {
		gameId: game.id,
		quizId: game.quizId,
		title: game.title,
		pin: game.pin,
		status: game.status,
		endReason: game.endReason,
		locked: game.locked,
		players: players.map(toLobbyPlayerView),
	};
}
