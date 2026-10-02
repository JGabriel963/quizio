import { describe, expect, it } from "vitest";

import { aGame, aPlayingGame } from "../testing/a-game";
import {
	assertJoinable,
	endGame,
	expireIfDue,
	GAME_TTL_MS,
	GameAlreadyStartedError,
	GameEndedError,
	isGameOpen,
} from "./game";
import {
	ANSWER_GRACE_MS,
	acceptsAnswers,
	closeAnswers,
	GAME_INTRO_MS,
	GameHasNoPlayersError,
	isAtStage,
	nextStage,
	phaseDurationMs,
	QUESTION_INTRO_MS,
	remainingMsOf,
	responseTimeOf,
	revealedThrough,
	StageNotDueError,
	startGame,
} from "./game-progress";

const now = new Date("2026-06-01T12:00:00.000Z");
const later = (ms: number) => new Date(now.getTime() + ms);

/** A game of three questions at `phase` of question `questionIndex`, since `now`. */
const at = (
	phase: Parameters<typeof aPlayingGame>[0],
	questionIndex = 0,
	questionCount = 3,
) => aPlayingGame(phase, { questionIndex, questionCount, since: now });

describe("starting a game (spec 009)", () => {
	it("starts in the game intro, at the first question", () => {
		const started = startGame(aGame(), {
			playerCount: 2,
			questionCount: 10,
			now,
		});

		expect(started).toMatchObject({
			status: "playing",
			questionCount: 10,
			progress: { questionIndex: 0, phase: "gameIntro", phaseStartedAt: now },
		});
		expect(isGameOpen(started)).toBe(true);
	});

	it("needs at least one player", () => {
		expect(() =>
			startGame(aGame(), { playerCount: 0, questionCount: 10, now }),
		).toThrow(GameHasNoPlayersError);
	});

	it("only starts from the lobby", () => {
		const input = { playerCount: 2, questionCount: 10, now };

		expect(() => startGame(at("answering"), input)).toThrow(
			GameAlreadyStartedError,
		);
		expect(() => startGame(endGame(aGame(), "host", now), input)).toThrow(
			GameEndedError,
		);
	});

	it("takes nobody new once it is playing", () => {
		expect(() => assertJoinable(at("gameIntro"))).toThrow(
			GameAlreadyStartedError,
		);
	});

	it("still expires while playing", () => {
		const game = { ...at("results"), createdAt: now };

		expect(expireIfDue(game, later(GAME_TTL_MS))).toMatchObject({
			status: "ended",
			endReason: "expired",
		});
	});
});

describe("phases of a game (spec 009)", () => {
	it("gives each phase its duration", () => {
		expect(phaseDurationMs("gameIntro", 20)).toBe(GAME_INTRO_MS);
		expect(phaseDurationMs("questionIntro", 20)).toBe(QUESTION_INTRO_MS);
		expect(phaseDurationMs("answering", 20)).toBe(20_000);
		expect(phaseDurationMs("results", 20)).toBeNull();
		expect(phaseDurationMs("scoreboard", 20)).toBeNull();
	});

	it("knows the time that is left, never below zero", () => {
		const { progress } = at("answering");

		expect(remainingMsOf(progress, 20, later(8_000))).toBe(12_000);
		expect(remainingMsOf(progress, 20, later(30_000))).toBe(0);
		expect(remainingMsOf(at("results").progress, 20, later(8_000))).toBeNull();
	});

	it("walks from the game intro through a question", () => {
		const intro = nextStage(at("gameIntro"), {
			timeLimitSeconds: 0,
			skip: false,
			now: later(GAME_INTRO_MS),
		});
		expect(intro.progress).toEqual({
			questionIndex: 0,
			phase: "questionIntro",
			phaseStartedAt: later(GAME_INTRO_MS),
		});

		const answering = nextStage(at("questionIntro"), {
			timeLimitSeconds: 20,
			skip: false,
			now: later(QUESTION_INTRO_MS),
		});
		expect(answering.progress).toMatchObject({
			questionIndex: 0,
			phase: "answering",
		});

		const results = nextStage(at("answering"), {
			timeLimitSeconds: 20,
			skip: false,
			now: later(20_000),
		});
		expect(results.progress).toMatchObject({
			questionIndex: 0,
			phase: "results",
		});
	});

	it("refuses a transition before its deadline", () => {
		expect(() =>
			nextStage(at("questionIntro"), {
				timeLimitSeconds: 20,
				skip: false,
				now: later(2_000),
			}),
		).toThrow(StageNotDueError);
		expect(() =>
			nextStage(at("answering"), {
				timeLimitSeconds: 20,
				skip: false,
				now: later(5_000),
			}),
		).toThrow(StageNotDueError);
		// Skipping is for the answers only.
		expect(() =>
			nextStage(at("questionIntro"), {
				timeLimitSeconds: 20,
				skip: true,
				now: later(2_000),
			}),
		).toThrow(StageNotDueError);
	});

	it("skipping closes the answers early", () => {
		const results = nextStage(at("answering"), {
			timeLimitSeconds: 20,
			skip: true,
			now: later(5_000),
		});

		expect(results.progress).toEqual({
			questionIndex: 0,
			phase: "results",
			phaseStartedAt: later(5_000),
		});
	});

	it("the results lead to the scoreboard, then to the next question", () => {
		const input = { timeLimitSeconds: 20, skip: false, now: later(1) };

		const scoreboard = nextStage(at("results", 0), input);
		expect(scoreboard).toMatchObject({
			status: "playing",
			progress: { questionIndex: 0, phase: "scoreboard" },
		});
		expect(nextStage(scoreboard, input)).toMatchObject({
			status: "playing",
			progress: { questionIndex: 1, phase: "questionIntro" },
		});
	});

	it("the last results finish the game, without a scoreboard (spec 011)", () => {
		const finished = nextStage(at("results", 2), {
			timeLimitSeconds: 20,
			skip: false,
			now: later(60_000),
		});

		expect(finished).toMatchObject({
			status: "finished",
			progress: null,
			endedAt: later(60_000),
			endReason: null,
		});
		expect(isGameOpen(finished)).toBe(false);
		// Finished is final: nothing ends or expires it afterwards.
		expect(endGame(finished, "host", later(70_000))).toBe(finished);
		expect(expireIfDue(finished, later(GAME_TTL_MS * 2))).toBe(finished);
	});

	it("a game of one question finishes at its results", () => {
		expect(
			nextStage(at("results", 0, 1), {
				timeLimitSeconds: 20,
				skip: false,
				now: later(1),
			}),
		).toMatchObject({ status: "finished", progress: null });
	});

	it("knows which question's points are revealed", () => {
		expect(revealedThrough(at("gameIntro").progress)).toBe(-1);
		expect(revealedThrough(at("answering", 0).progress)).toBe(-1);
		expect(revealedThrough(at("results", 0).progress)).toBe(0);
		expect(revealedThrough(at("scoreboard", 0).progress)).toBe(0);
		expect(revealedThrough(at("questionIntro", 1).progress)).toBe(0);
		expect(revealedThrough(at("answering", 1).progress)).toBe(0);
	});

	it("a scoreboard left at the last question finishes the game", () => {
		// Only a game that was there before spec 011: the last results end it now.
		expect(
			nextStage(at("scoreboard", 2), {
				timeLimitSeconds: 20,
				skip: false,
				now: later(60_000),
			}),
		).toMatchObject({ status: "finished", progress: null });
	});

	it("a game that is not playing takes no transition", () => {
		const input = { timeLimitSeconds: 20, skip: false, now };

		expect(() => nextStage(aGame(), input)).toThrow(StageNotDueError);
		expect(() => nextStage(endGame(aGame(), "host", now), input)).toThrow(
			GameEndedError,
		);
	});

	it("tells whether the game is still at a stage", () => {
		const game = at("answering", 1);

		expect(isAtStage(game, { questionIndex: 1, phase: "answering" })).toBe(
			true,
		);
		expect(isAtStage(game, { questionIndex: 1, phase: "results" })).toBe(false);
		expect(isAtStage(game, { questionIndex: 0, phase: "answering" })).toBe(
			false,
		);
		expect(isAtStage(aGame(), { questionIndex: 0, phase: "gameIntro" })).toBe(
			false,
		);
	});

	it("closes the answers when everybody answered", () => {
		expect(closeAnswers(at("answering", 1), later(4_000)).progress).toEqual({
			questionIndex: 1,
			phase: "results",
			phaseStartedAt: later(4_000),
		});
	});
});

describe("answer window (spec 009)", () => {
	const window = (elapsedMs: number, questionIndex = 0) => ({
		questionIndex,
		timeLimitSeconds: 20,
		now: later(elapsedMs),
	});

	it("accepts an answer within the limit plus the grace", () => {
		const game = at("answering");

		expect(acceptsAnswers(game, window(0))).toBe(true);
		expect(acceptsAnswers(game, window(20_300))).toBe(true);
		expect(acceptsAnswers(game, window(20_000 + ANSWER_GRACE_MS))).toBe(true);
		expect(acceptsAnswers(game, window(21_000))).toBe(false);
	});

	it("only accepts answers for the question being answered", () => {
		expect(acceptsAnswers(at("answering", 1), window(1_000, 0))).toBe(false);
		expect(acceptsAnswers(at("questionIntro"), window(1_000))).toBe(false);
		expect(acceptsAnswers(at("results"), window(1_000))).toBe(false);
		expect(acceptsAnswers(aGame(), window(1_000))).toBe(false);
	});

	it("measures the response time from the phase start, capped at the limit", () => {
		const { progress } = at("answering");

		expect(responseTimeOf(progress, 20, later(4_200))).toBe(4_200);
		expect(responseTimeOf(progress, 20, later(20_300))).toBe(20_000);
	});
});
