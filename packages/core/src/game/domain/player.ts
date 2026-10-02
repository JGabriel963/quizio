import type { Game } from "./game";
import { isPlaying } from "./game-progress";
import { nicknameKeyOf } from "./nickname";

/**
 * An anonymous participant of one game, known by a nickname. The id is public;
 * the secret proves, from the browser that joined, who the player is (ADR 0009).
 */
export interface Player {
	id: string;
	gameId: string;
	nickname: string;
	/** Unique in the game, removed players included (spec 008, RN-30, RN-42). */
	nicknameKey: string;
	secret: string;
	/**
	 * The first question the player may answer: 0 for who joined in the lobby,
	 * later for who joined a game in progress (spec 012, RN-13).
	 */
	firstQuestionIndex: number;
	joinedAt: Date;
	removedAt: Date | null;
}

export function newPlayer(input: {
	id: string;
	gameId: string;
	nickname: string;
	secret: string;
	firstQuestionIndex: number;
	now: Date;
}): Player {
	return {
		id: input.id,
		gameId: input.gameId,
		nickname: input.nickname,
		nicknameKey: nicknameKeyOf(input.nickname),
		secret: input.secret,
		firstQuestionIndex: input.firstQuestionIndex,
		joinedAt: input.now,
		removedAt: null,
	};
}

export function isActivePlayer(player: Player): boolean {
	return player.removedAt === null;
}

/** The row stays, so the nickname stays blocked in the game (RN-30). */
export function removePlayer(player: Player, now: Date): Player {
	return isActivePlayer(player) ? { ...player, removedAt: now } : player;
}

export function hasPlayerSecret(player: Player, secret: string): boolean {
	return player.secret === secret;
}

/**
 * The first question of who joins now (spec 012, RN-13): the one in course
 * while its answers have not opened, the next one after that. It may be past
 * the last question: that player only sees the end (RN-17).
 */
export function firstQuestionFor(game: Game): number {
	if (!isPlaying(game)) {
		return 0;
	}
	const { questionIndex, phase } = game.progress;
	return phase === "gameIntro" || phase === "questionIntro"
		? questionIndex
		: questionIndex + 1;
}

/** The questions before the player's first one are not theirs to answer (RN-14). */
export function canAnswer(player: Player, questionIndex: number): boolean {
	return questionIndex >= player.firstQuestionIndex;
}
