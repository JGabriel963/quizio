import { DomainError } from "../../shared/domain/domain-error";
import type { Avatar } from "./avatar";
import { type Game, isGameOpen } from "./game";
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
	/** Drawn on joining, changed while waiting (spec 027, RN-07, RN-13). */
	avatar: Avatar;
	joinedAt: Date;
	removedAt: Date | null;
}

export function newPlayer(input: {
	id: string;
	gameId: string;
	nickname: string;
	secret: string;
	firstQuestionIndex: number;
	avatar: Avatar;
	now: Date;
}): Player {
	return {
		id: input.id,
		gameId: input.gameId,
		nickname: input.nickname,
		nicknameKey: nicknameKeyOf(input.nickname),
		secret: input.secret,
		firstQuestionIndex: input.firstQuestionIndex,
		avatar: input.avatar,
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

/** Out of the waiting time, with the characters off or from a removed player (RN-13, RN-25). */
export class AvatarFixedError extends DomainError {
	readonly code = "GAME.AVATAR_FIXED";
}

/**
 * While the player waits to play (spec 027, RN-13): in the lobby, or, for who
 * joined a game in progress, until their first question opens. Never with
 * the characters off (RN-25).
 */
export function canChangeAvatar(game: Game, player: Player): boolean {
	if (
		!isActivePlayer(player) ||
		!isGameOpen(game) ||
		!game.options.gameCharacters
	) {
		return false;
	}
	return (
		game.status === "lobby" ||
		(isPlaying(game) && !canAnswer(player, game.progress.questionIndex))
	);
}

export function changePlayerAvatar(
	game: Game,
	player: Player,
	avatar: Avatar,
): Player {
	if (!canChangeAvatar(game, player)) {
		throw new AvatarFixedError("The avatar can no longer change");
	}
	return { ...player, avatar };
}

/** The only rule of what the screens show: no avatar with the characters off (RN-25, RN-26). */
export function avatarShown(game: Game, player: Player): Avatar | null {
	return game.options.gameCharacters ? player.avatar : null;
}

/** The players with what the screens may show of their avatars: what the standings take. */
export function shownPlayers(
	game: Game,
	players: readonly Player[],
): { id: string; nickname: string; avatar: Avatar | null }[] {
	return players.map((player) => ({
		id: player.id,
		nickname: player.nickname,
		avatar: avatarShown(game, player),
	}));
}
