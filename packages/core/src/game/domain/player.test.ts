import { describe, expect, it } from "vitest";

import { aGame, aPlayer, aPlayingGame } from "../testing/a-game";
import { endGame } from "./game";
import {
	AvatarFixedError,
	avatarShown,
	canAnswer,
	canChangeAvatar,
	changePlayerAvatar,
	firstQuestionFor,
	newPlayer,
	removePlayer,
} from "./player";

describe("joining a game in progress (spec 012)", () => {
	it("who joins in the lobby starts at the first question", () => {
		expect(firstQuestionFor(aGame())).toBe(0);
		expect(
			newPlayer({
				id: "player-1",
				gameId: "game-1",
				nickname: "Caio",
				secret: "s",
				firstQuestionIndex: firstQuestionFor(aGame()),
				avatar: { character: "koala", accessory: null },
				now: new Date("2026-06-01T12:00:00.000Z"),
			}).firstQuestionIndex,
		).toBe(0);
	});

	it("who joins before the answers open plays that question", () => {
		expect(firstQuestionFor(aPlayingGame("gameIntro"))).toBe(0);
		expect(
			firstQuestionFor(aPlayingGame("questionIntro", { questionIndex: 1 })),
		).toBe(1);
	});

	it("who joins from the answers on starts at the next question", () => {
		for (const phase of ["answering", "results", "scoreboard"] as const) {
			expect(firstQuestionFor(aPlayingGame(phase, { questionIndex: 1 }))).toBe(
				2,
			);
		}
	});

	it("who joins at the last answers has no question to play", () => {
		const game = aPlayingGame("answering", {
			questionIndex: 2,
			questionCount: 3,
		});

		expect(firstQuestionFor(game)).toBe(3);
	});

	it("may answer from the first question on", () => {
		const player = aPlayer({ firstQuestionIndex: 2 });

		expect(canAnswer(player, 1)).toBe(false);
		expect(canAnswer(player, 2)).toBe(true);
		expect(canAnswer(player, 3)).toBe(true);
		expect(canAnswer(aPlayer(), 0)).toBe(true);
	});
});

describe("the player's avatar (spec 027)", () => {
	const tiger = { character: "tiger", accessory: "crown" } as const;
	const now = new Date("2026-06-01T12:02:00.000Z");

	it("a new player keeps the avatar given", () => {
		const player = newPlayer({
			id: "player-1",
			gameId: "game-1",
			nickname: "Caio",
			secret: "s",
			firstQuestionIndex: 0,
			avatar: tiger,
			now,
		});

		expect(player.avatar).toEqual(tiger);
	});

	it("changes the avatar in the lobby", () => {
		const changed = changePlayerAvatar(aGame(), aPlayer(), tiger);

		expect(changed.avatar).toEqual(tiger);
		expect(canChangeAvatar(aGame(), aPlayer())).toBe(true);
	});

	it("refuses a change once the game intro started", () => {
		for (const game of [
			aPlayingGame("gameIntro"),
			aPlayingGame("answering", { questionIndex: 1 }),
		]) {
			expect(canChangeAvatar(game, aPlayer())).toBe(false);
			expect(() => changePlayerAvatar(game, aPlayer(), tiger)).toThrow(
				AvatarFixedError,
			);
		}
	});

	it("a player who joined during the answers changes until the next question opens", () => {
		const late = aPlayer({ firstQuestionIndex: 2 });

		for (const phase of ["answering", "results", "scoreboard"] as const) {
			expect(
				canChangeAvatar(aPlayingGame(phase, { questionIndex: 1 }), late),
			).toBe(true);
		}
		expect(
			canChangeAvatar(
				aPlayingGame("questionIntro", { questionIndex: 2 }),
				late,
			),
		).toBe(false);
	});

	it("refuses a change with characters off", () => {
		const game = aGame({
			options: { ...aGame().options, gameCharacters: false },
		});

		expect(canChangeAvatar(game, aPlayer())).toBe(false);
		expect(() => changePlayerAvatar(game, aPlayer(), tiger)).toThrow(
			AvatarFixedError,
		);
	});

	it("refuses a change from a removed player or in a game that is over", () => {
		expect(canChangeAvatar(aGame(), removePlayer(aPlayer(), now))).toBe(false);
		expect(canChangeAvatar(endGame(aGame(), "host", now), aPlayer())).toBe(
			false,
		);
	});

	it("avatarShown is null with characters off", () => {
		const player = aPlayer({ avatar: tiger });

		expect(avatarShown(aGame(), player)).toEqual(tiger);
		expect(
			avatarShown(
				aGame({ options: { ...aGame().options, gameCharacters: false } }),
				player,
			),
		).toBeNull();
	});
});
