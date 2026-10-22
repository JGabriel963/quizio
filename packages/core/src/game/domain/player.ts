import { DomainError } from "../../shared/domain/domain-error";
import type { Avatar } from "./avatar";
import { type Game, isGameOpen } from "./game";
import { isPlaying } from "./game-progress";
import type { GameQuestion } from "./game-question";
import { nicknameKeyOf } from "./nickname";
import {
	firstProgress,
	type ParticipantProgress,
} from "./participant-progress";
import { wrongOrderOf } from "./puzzle";

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
	/** Drawn on joining, changed while waiting (spec 028, RN-07, RN-13). */
	avatar: Avatar;
	joinedAt: Date;
	removedAt: Date | null;
	/** Where the participant of an assignment is; null in a live game (spec 030). */
	progress: ParticipantProgress | null;
	/**
	 * The answers of each question in the participant's own order, by the ids
	 * of the question's choices; null when they keep the question's (RN-07).
	 */
	choiceOrder: string[][] | null;
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
		progress: null,
		choiceOrder: null,
	};
}

/**
 * Who joins an assignment (spec 030, RN-05 to RN-07): all the questions are
 * theirs, they start where `firstProgress` says, and with "Ordem aleatória de
 * respostas" every Quiz question gets an order drawn once, for them alone;
 * true/false keeps its order (spec 012). A puzzle always gets one of its own,
 * never a right one (spec 033, RN-28).
 */
export function newAssignmentParticipant(input: {
	id: string;
	game: Game;
	questions: readonly GameQuestion[];
	nickname: string;
	secret: string;
	avatar: Avatar;
	shuffle: <T>(items: readonly T[]) => T[];
	now: Date;
}): Player {
	const { randomizeAnswers } = input.game.options;
	const choiceOrder =
		randomizeAnswers ||
		input.questions.some((question) => question.type === "puzzle")
			? input.questions.map((question) => {
					if (question.type === "puzzle") {
						return wrongOrderOf(question, input.shuffle);
					}
					const ids = question.choices.map(({ id }) => id);
					return randomizeAnswers && question.type === "quiz"
						? input.shuffle(ids)
						: ids;
				})
			: null;
	return {
		...newPlayer({
			id: input.id,
			gameId: input.game.id,
			nickname: input.nickname,
			secret: input.secret,
			firstQuestionIndex: 0,
			avatar: input.avatar,
			now: input.now,
		}),
		progress: firstProgress(input.game, input.now),
		choiceOrder,
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
 * While the player waits to play (spec 028, RN-13): in the lobby, or, for who
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
