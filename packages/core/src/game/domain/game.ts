import { DomainError } from "../../shared/domain/domain-error";
import { NotFoundError } from "../../shared/domain/not-found-error";
import type { GameProgress } from "./game-progress";

/**
 * `lobby` and `playing` are open. `finished` played every question (spec 009,
 * RN-30); `ended` was closed before that, for a reason.
 */
export const GAME_STATUSES = ["lobby", "playing", "finished", "ended"] as const;
export type GameStatus = (typeof GAME_STATUSES)[number];

/**
 * Why a game was ended: by its host, by a new game of the same quiz (RN-07),
 * by its deadline (RN-11) or because the quiz was deleted for good (RN-34).
 */
export const GAME_END_REASONS = [
	"host",
	"replaced",
	"expired",
	"quizDeleted",
] as const;
export type GameEndReason = (typeof GAME_END_REASONS)[number];

/** A game stays open for at most 8 hours (spec 008, RN-11). */
export const GAME_TTL_MS = 8 * 60 * 60 * 1000;

/** Technical limit, not a plan (RN-45). */
export const GAME_MAX_PLAYERS = 200;

/** A live game of a quiz (spec 008; ADR 0009). */
export interface Game {
	id: string;
	/** The host: the owner of the quiz when the game was created. */
	ownerId: string;
	quizId: string;
	/** Number of the playable version the game was created with (RN-04). */
	quizVersion: number;
	/** The quiz's title at creation; later renames do not reach the game. */
	title: string;
	pin: string;
	status: GameStatus;
	/** Nobody new gets in; who is in stays (RN-24). */
	locked: boolean;
	createdAt: Date;
	expiresAt: Date;
	/** Set when the game is finished or ended: it frees the PIN. */
	endedAt: Date | null;
	/** Null for a finished game. */
	endReason: GameEndReason | null;
	/** How many questions the game has; 0 until it starts (spec 009). */
	questionCount: number;
	/** Where the game is; null in the lobby and once it is over. */
	progress: GameProgress | null;
}

export class GameNotFoundError extends NotFoundError {
	readonly code = "GAME.NOT_FOUND";
}

/** The quiz to host does not exist for the caller. */
export class GameQuizNotFoundError extends NotFoundError {
	readonly code = "GAME.QUIZ_NOT_FOUND";
}

/** Drafts and quizzes in the trash cannot be hosted (RN-02). */
export class QuizNotPlayableError extends DomainError {
	readonly code = "GAME.QUIZ_NOT_PLAYABLE";
}

/** No open game has that PIN: unknown, ended and expired look the same (RN-38). */
export class GamePinNotRecognizedError extends DomainError {
	readonly code = "GAME.PIN_NOT_RECOGNIZED";
}

export class TooManyPinAttemptsError extends DomainError {
	readonly code = "GAME.TOO_MANY_PIN_ATTEMPTS";
}

export class GameLockedError extends DomainError {
	readonly code = "GAME.LOCKED";
}

export class GameFullError extends DomainError {
	readonly code = "GAME.FULL";
}

export class GameEndedError extends DomainError {
	readonly code = "GAME.ENDED";
}

/** Nobody new gets into a game in progress (spec 009, RN-03). */
export class GameAlreadyStartedError extends DomainError {
	readonly code = "GAME.ALREADY_STARTED";
}

/** In use, or blocked because its player was removed (RN-30, RN-42). */
export class NicknameTakenError extends DomainError {
	readonly code = "GAME.NICKNAME_TAKEN";
}

export function newGame(input: {
	id: string;
	ownerId: string;
	quizId: string;
	quizVersion: number;
	title: string;
	pin: string;
	now: Date;
}): Game {
	return {
		id: input.id,
		ownerId: input.ownerId,
		quizId: input.quizId,
		quizVersion: input.quizVersion,
		title: input.title,
		pin: input.pin,
		status: "lobby",
		locked: false,
		createdAt: input.now,
		expiresAt: new Date(input.now.getTime() + GAME_TTL_MS),
		endedAt: null,
		endReason: null,
		questionCount: 0,
		progress: null,
	};
}

/** In the lobby or being played: it holds its PIN and can still be ended. */
export function isGameOpen(game: Game): boolean {
	return game.status === "lobby" || game.status === "playing";
}

/** Ending twice keeps the first reason and instant (RN-31, RN-32). */
export function endGame(game: Game, reason: GameEndReason, now: Date): Game {
	if (!isGameOpen(game)) {
		return game;
	}
	return { ...game, status: "ended", endedAt: now, endReason: reason };
}

/**
 * No timer ends a game (ADR 0009): whoever loads one past its deadline sees
 * it ended, at the deadline.
 */
export function expireIfDue(game: Game, now: Date): Game {
	return isGameOpen(game) && now >= game.expiresAt
		? endGame(game, "expired", game.expiresAt)
		: game;
}

/** Another host's game does not exist for the caller (RN-20). */
export function requireOwnedGame(game: Game | null, ownerId: string): Game {
	if (!game || game.ownerId !== ownerId) {
		throw new GameNotFoundError("Game not found");
	}
	return game;
}

export function assertGameOpen(game: Game): void {
	if (!isGameOpen(game)) {
		throw new GameEndedError("The game has ended");
	}
}

export function setGameLocked(game: Game, locked: boolean): Game {
	assertGameOpen(game);
	return { ...game, locked };
}

/** What a player needs to get in: a lobby that is not locked. */
export function assertJoinable(game: Game | null): asserts game is Game {
	if (!game || !isGameOpen(game)) {
		throw new GamePinNotRecognizedError("No open game has this PIN");
	}
	if (game.status !== "lobby") {
		throw new GameAlreadyStartedError("The game has already started");
	}
	if (game.locked) {
		throw new GameLockedError("The game is locked");
	}
}
