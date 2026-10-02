import { describe, expect, it } from "vitest";

import { aGame, aPlayingGame } from "../testing/a-game";
import { endGame, GameEndedError } from "./game";
import {
	changeGameOptions,
	DEFAULT_GAME_OPTIONS,
	GameOptionsFixedError,
} from "./game-options";

const now = new Date("2026-06-01T12:00:00.000Z");

describe("game options (spec 012)", () => {
	it("every option starts off", () => {
		expect(DEFAULT_GAME_OPTIONS).toEqual({
			showQuestionsOnDevices: false,
			randomizeQuestions: false,
			randomizeAnswers: false,
		});
	});

	it("changes an option in the lobby", () => {
		const game = aGame();

		const changed = changeGameOptions(game, {
			randomizeQuestions: true,
			randomizeAnswers: true,
		});

		expect(changed.options).toEqual({
			showQuestionsOnDevices: false,
			randomizeQuestions: true,
			randomizeAnswers: true,
		});
		// The game it was given is left as it was.
		expect(game.options).toEqual(DEFAULT_GAME_OPTIONS);
	});

	it("changes showing the questions while the game is on", () => {
		const changed = changeGameOptions(aPlayingGame("answering"), {
			showQuestionsOnDevices: true,
		});

		expect(changed.options.showQuestionsOnDevices).toBe(true);
		expect(changed.progress).toEqual(aPlayingGame("answering").progress);
	});

	it("refuses the random orders once the game started", () => {
		const game = aPlayingGame("questionIntro");

		expect(() => changeGameOptions(game, { randomizeQuestions: true })).toThrow(
			GameOptionsFixedError,
		);
		expect(() => changeGameOptions(game, { randomizeAnswers: true })).toThrow(
			GameOptionsFixedError,
		);
	});

	it("accepts a random order that stays as it is while the game is on", () => {
		const game = aPlayingGame(
			"answering",
			{},
			{ options: { ...DEFAULT_GAME_OPTIONS, randomizeAnswers: true } },
		);

		const changed = changeGameOptions(game, {
			showQuestionsOnDevices: true,
			randomizeAnswers: true,
		});

		expect(changed.options).toEqual({
			showQuestionsOnDevices: true,
			randomizeQuestions: false,
			randomizeAnswers: true,
		});
	});

	it("refuses an ended game", () => {
		expect(() =>
			changeGameOptions(endGame(aGame(), "host", now), {
				showQuestionsOnDevices: true,
			}),
		).toThrow(GameEndedError);
	});
});
