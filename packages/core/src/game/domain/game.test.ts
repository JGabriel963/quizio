import { describe, expect, it } from "vitest";

import { aGame, aPlayer } from "../testing/a-game";
import {
	assertJoinable,
	endGame,
	expireIfDue,
	GAME_TTL_MS,
	GameEndedError,
	GameLockedError,
	GameNotFoundError,
	GamePinNotRecognizedError,
	isGameOpen,
	newGame,
	requireOwnedGame,
	setGameLocked,
} from "./game";
import { gameChannel } from "./game-events";
import {
	hasPlayerSecret,
	isActivePlayer,
	newPlayer,
	removePlayer,
} from "./player";

const now = new Date("2026-06-01T12:00:00.000Z");
const later = (ms: number) => new Date(now.getTime() + ms);

describe("game (spec 008)", () => {
	it("a new game is an open, unlocked lobby for 8 hours", () => {
		const game = newGame({
			id: "game-1",
			ownerId: "user-1",
			quizId: "quiz-1",
			quizVersion: 3,
			title: "Capitais",
			pin: "265914",
			now,
		});

		expect(game).toMatchObject({
			status: "lobby",
			locked: false,
			quizVersion: 3,
			title: "Capitais",
			endedAt: null,
			endReason: null,
		});
		expect(game.expiresAt).toEqual(later(GAME_TTL_MS));
		expect(isGameOpen(game)).toBe(true);
	});

	it("is ended once past its deadline, at the deadline", () => {
		const game = aGame({ createdAt: now });

		expect(expireIfDue(game, later(GAME_TTL_MS - 1))).toBe(game);
		expect(expireIfDue(game, later(GAME_TTL_MS))).toMatchObject({
			status: "ended",
			endReason: "expired",
			endedAt: game.expiresAt,
		});
	});

	it("ending is idempotent", () => {
		const ended = endGame(aGame(), "host", later(1000));

		expect(ended).toMatchObject({
			status: "ended",
			endReason: "host",
			endedAt: later(1000),
		});
		expect(endGame(ended, "replaced", later(2000))).toBe(ended);
		expect(expireIfDue(ended, later(GAME_TTL_MS * 2))).toBe(ended);
	});

	it("another owner's game is not found", () => {
		const game = aGame();

		expect(requireOwnedGame(game, "user-1")).toBe(game);
		expect(() => requireOwnedGame(game, "user-2")).toThrow(GameNotFoundError);
		expect(() => requireOwnedGame(null, "user-1")).toThrow(GameNotFoundError);
	});

	it("locks and unlocks while open", () => {
		const locked = setGameLocked(aGame(), true);

		expect(locked.locked).toBe(true);
		expect(setGameLocked(locked, false).locked).toBe(false);
		expect(() => setGameLocked(endGame(aGame(), "host", now), true)).toThrow(
			GameEndedError,
		);
	});

	it("refuses joining a missing, ended or locked game", () => {
		expect(() => assertJoinable(aGame())).not.toThrow();
		expect(() => assertJoinable(null)).toThrow(GamePinNotRecognizedError);
		expect(() => assertJoinable(endGame(aGame(), "host", now))).toThrow(
			GamePinNotRecognizedError,
		);
		expect(() => assertJoinable(aGame({ locked: true }))).toThrow(
			GameLockedError,
		);
	});

	it("has one channel per game", () => {
		expect(gameChannel("abc")).toBe("game-abc");
	});
});

describe("player (spec 008)", () => {
	it("a new player is active and keyed by the normalized nickname", () => {
		const player = newPlayer({
			id: "player-1",
			gameId: "game-1",
			nickname: "José",
			secret: "s3cret",
			now,
		});

		expect(player).toMatchObject({ nickname: "José", nicknameKey: "jose" });
		expect(isActivePlayer(player)).toBe(true);
		expect(hasPlayerSecret(player, "s3cret")).toBe(true);
		expect(hasPlayerSecret(player, "other")).toBe(false);
	});

	it("removing keeps the first instant", () => {
		const removed = removePlayer(aPlayer(), later(1000));

		expect(isActivePlayer(removed)).toBe(false);
		expect(removePlayer(removed, later(2000))).toBe(removed);
	});
});
