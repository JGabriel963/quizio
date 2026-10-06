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
			autoplay: false,
		});
	});

	it("changes an option in the lobby", () => {
		const game = aGame();

		const changed = changeGameOptions(
			game,
			{
				randomizeQuestions: true,
				randomizeAnswers: true,
			},
			now,
		);

		expect(changed.options).toEqual({
			showQuestionsOnDevices: false,
			randomizeQuestions: true,
			randomizeAnswers: true,
			autoplay: false,
		});
		// The game it was given is left as it was.
		expect(game.options).toEqual(DEFAULT_GAME_OPTIONS);
	});

	it("changes showing the questions while the game is on", () => {
		const changed = changeGameOptions(
			aPlayingGame("answering"),
			{
				showQuestionsOnDevices: true,
			},
			now,
		);

		expect(changed.options.showQuestionsOnDevices).toBe(true);
		expect(changed.progress).toEqual(aPlayingGame("answering").progress);
	});

	it("refuses the random orders once the game started", () => {
		const game = aPlayingGame("questionIntro");

		expect(() =>
			changeGameOptions(game, { randomizeQuestions: true }, now),
		).toThrow(GameOptionsFixedError);
		expect(() =>
			changeGameOptions(game, { randomizeAnswers: true }, now),
		).toThrow(GameOptionsFixedError);
	});

	it("accepts a random order that stays as it is while the game is on", () => {
		const game = aPlayingGame(
			"answering",
			{},
			{ options: { ...DEFAULT_GAME_OPTIONS, randomizeAnswers: true } },
		);

		const changed = changeGameOptions(
			game,
			{
				showQuestionsOnDevices: true,
				randomizeAnswers: true,
			},
			now,
		);

		expect(changed.options).toEqual({
			showQuestionsOnDevices: true,
			randomizeQuestions: false,
			randomizeAnswers: true,
			autoplay: false,
		});
	});

	it("refuses an ended game", () => {
		expect(() =>
			changeGameOptions(
				endGame(aGame(), "host", now),
				{
					showQuestionsOnDevices: true,
				},
				now,
			),
		).toThrow(GameEndedError);
	});
});

describe("game options: autoplay (spec 014)", () => {
	const later = (ms: number) => new Date(now.getTime() + ms);

	it("autoplay starts off", () => {
		expect(DEFAULT_GAME_OPTIONS.autoplay).toBe(false);
		expect(aGame().autoplaySince).toBeNull();
	});

	it("turning autoplay on in the lobby counts from then", () => {
		const changed = changeGameOptions(
			aGame(),
			{ autoplay: true },
			later(60_000),
		);

		expect(changed.options.autoplay).toBe(true);
		expect(changed.autoplaySince).toEqual(later(60_000));
	});

	it("turns autoplay on and off while the game is on", () => {
		const on = changeGameOptions(
			aPlayingGame("results"),
			{ autoplay: true },
			later(40_000),
		);
		expect(on).toMatchObject({
			options: { autoplay: true },
			autoplaySince: later(40_000),
		});

		const off = changeGameOptions(on, { autoplay: false }, later(42_000));
		expect(off.options.autoplay).toBe(false);
		expect(off.autoplaySince).toBeNull();
	});

	it("turning it on again keeps the instant it has", () => {
		const on = changeGameOptions(aGame(), { autoplay: true }, later(1_000));

		const again = changeGameOptions(on, { autoplay: true }, later(9_000));

		expect(again.autoplaySince).toEqual(later(1_000));
	});

	it("another option leaves autoplay as it is", () => {
		const on = changeGameOptions(aGame(), { autoplay: true }, later(1_000));

		const changed = changeGameOptions(
			on,
			{ showQuestionsOnDevices: true },
			later(9_000),
		);

		expect(changed.options.autoplay).toBe(true);
		expect(changed.autoplaySince).toEqual(later(1_000));
	});

	it("refuses an ended game", () => {
		expect(() =>
			changeGameOptions(endGame(aGame(), "host", now), { autoplay: true }, now),
		).toThrow(GameEndedError);
	});
});
