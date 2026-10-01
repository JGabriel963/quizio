import type { Game } from "../domain/game";
import { GAME_TTL_MS } from "../domain/game";
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
		createdAt,
		expiresAt: new Date(createdAt.getTime() + GAME_TTL_MS),
		endedAt: null,
		endReason: null,
		...overrides,
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
		joinedAt: new Date("2026-06-01T12:01:00.000Z"),
		removedAt: null,
		...overrides,
	};
}
