import type { Game } from "../domain/game";
import { GAME_TTL_MS } from "../domain/game";
import { DEFAULT_GAME_OPTIONS } from "../domain/game-options";
import type { GamePhase, PlayingGame } from "../domain/game-progress";
import { nicknameKeyOf } from "../domain/nickname";
import type { Player } from "../domain/player";

/** Test builder: an open lobby of quiz-1, hosted by user-1. */
export function aGame(overrides: Partial<Game> = {}): Game {
	const createdAt = overrides.createdAt ?? new Date("2026-06-01T12:00:00.000Z");
	return {
		id: "game-1",
		ownerId: "user-1",
		quizId: "quiz-1",
		quizVersion: 1,
		title: "Bom de Bíblia (Junho)",
		pin: "265914",
		status: "lobby",
		locked: false,
		options: DEFAULT_GAME_OPTIONS,
		createdAt,
		expiresAt: new Date(createdAt.getTime() + GAME_TTL_MS),
		endedAt: null,
		endReason: null,
		questionCount: 0,
		progress: null,
		hostSeenAt: createdAt,
		...overrides,
	};
}

/** Test builder: game-1 being played, at `phase` of a question. */
export function aPlayingGame(
	phase: GamePhase = "answering",
	options: {
		questionIndex?: number;
		questionCount?: number;
		/** When the phase started. */
		since?: Date;
	} = {},
	overrides: Partial<Game> = {},
): PlayingGame {
	return {
		...aGame(overrides),
		status: "playing",
		questionCount: options.questionCount ?? 3,
		progress: {
			questionIndex: options.questionIndex ?? 0,
			phase,
			phaseStartedAt: options.since ?? new Date("2026-06-01T12:00:00.000Z"),
		},
	};
}

/** Test builder: an active player of game-1. */
export function aPlayer(overrides: Partial<Player> = {}): Player {
	const nickname = overrides.nickname ?? "ACT";
	return {
		id: "player-1",
		gameId: "game-1",
		nickname,
		nicknameKey: nicknameKeyOf(nickname),
		secret: "secret-1",
		firstQuestionIndex: 0,
		joinedAt: new Date("2026-06-01T12:01:00.000Z"),
		removedAt: null,
		...overrides,
	};
}
