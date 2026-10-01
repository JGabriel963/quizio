import { DomainError } from "../../shared/domain/domain-error";
import {
	assertGameOpen,
	type Game,
	GameAlreadyStartedError,
	GameEndedError,
} from "./game";

/**
 * The phases a game in progress goes through (spec 009, RN-04, RN-06): one
 * opening, then intro, answers and results for each question.
 */
export const GAME_PHASES = [
	"gameIntro",
	"questionIntro",
	"answering",
	"results",
] as const;
export type GamePhase = (typeof GAME_PHASES)[number];

/** The opening of the game (RN-04). */
export const GAME_INTRO_MS = 3_000;
/** Reading time: it does not count as response time (RN-08). */
export const QUESTION_INTRO_MS = 5_000;
/** How late an answer may arrive, for the network's sake (RN-18). */
export const ANSWER_GRACE_MS = 500;

/**
 * Where a game in progress is. There is no timer (ADR 0009): a phase's
 * deadline is `phaseStartedAt` plus its duration, checked against the
 * server's clock by whoever asks.
 */
export interface GameProgress {
	/** 0-based; 0 during the game intro. */
	questionIndex: number;
	phase: GamePhase;
	phaseStartedAt: Date;
}

/** Which stage a request starts from: it makes every transition idempotent (RN-12). */
export interface StageRef {
	questionIndex: number;
	phase: GamePhase;
}

export class GameHasNoPlayersError extends DomainError {
	readonly code = "GAME.NO_PLAYERS";
}

/** The phase's time has not passed, and the request is not a skip (RN-12). */
export class StageNotDueError extends DomainError {
	readonly code = "GAME.STAGE_NOT_DUE";
}

/** A game that is playing always has a progress. */
export type PlayingGame = Game & { status: "playing"; progress: GameProgress };

export function isPlaying(game: Game): game is PlayingGame {
	return game.status === "playing" && game.progress !== null;
}

/** "Iniciar": from the lobby to the game intro (RN-01, RN-02). */
export function startGame(
	game: Game,
	input: { playerCount: number; questionCount: number; now: Date },
): Game {
	assertGameOpen(game);
	if (game.status !== "lobby") {
		throw new GameAlreadyStartedError("The game has already started");
	}
	if (input.playerCount < 1) {
		throw new GameHasNoPlayersError("A game needs at least one player");
	}
	return {
		...game,
		status: "playing",
		questionCount: input.questionCount,
		progress: {
			questionIndex: 0,
			phase: "gameIntro",
			phaseStartedAt: input.now,
		},
	};
}

/** How long a phase lasts; null for the results, which wait for the host (RN-11). */
export function phaseDurationMs(
	phase: GamePhase,
	timeLimitSeconds: number,
): number | null {
	switch (phase) {
		case "gameIntro":
			return GAME_INTRO_MS;
		case "questionIntro":
			return QUESTION_INTRO_MS;
		case "answering":
			return timeLimitSeconds * 1000;
		case "results":
			return null;
	}
}

function elapsedMs(progress: GameProgress, now: Date): number {
	return Math.max(0, now.getTime() - progress.phaseStartedAt.getTime());
}

/** Time left in the phase, by the server's clock; null when it has no deadline. */
export function remainingMsOf(
	progress: GameProgress,
	timeLimitSeconds: number,
	now: Date,
): number | null {
	const duration = phaseDurationMs(progress.phase, timeLimitSeconds);
	return duration === null
		? null
		: Math.max(0, duration - elapsedMs(progress, now));
}

export function isAtStage(game: Game, stage: StageRef): boolean {
	return (
		isPlaying(game) &&
		game.progress.questionIndex === stage.questionIndex &&
		game.progress.phase === stage.phase
	);
}

function moveTo(game: Game, stage: StageRef, now: Date): Game {
	return { ...game, progress: { ...stage, phaseStartedAt: now } };
}

/**
 * The stage after the current one, or the game finished after the last
 * results (RN-30). A phase with a deadline only ends once it has passed;
 * `skip` ends the answers early ("Pular o cronômetro", RN-10).
 */
export function nextStage(
	game: Game,
	input: {
		/** Of the current question; only the answers phase uses it. */
		timeLimitSeconds: number;
		skip: boolean;
		now: Date;
	},
): Game {
	if (!isPlaying(game)) {
		if (game.status === "lobby") {
			throw new StageNotDueError("The game has not started");
		}
		throw new GameEndedError("The game has ended");
	}
	const { progress } = game;
	const { questionIndex, phase } = progress;
	const remaining = remainingMsOf(progress, input.timeLimitSeconds, input.now);
	const skipped = input.skip && phase === "answering";
	if (remaining !== null && remaining > 0 && !skipped) {
		throw new StageNotDueError(`The ${phase} phase has ${remaining} ms left`);
	}

	switch (phase) {
		case "gameIntro":
			return moveTo(game, { questionIndex, phase: "questionIntro" }, input.now);
		case "questionIntro":
			return moveTo(game, { questionIndex, phase: "answering" }, input.now);
		case "answering":
			return moveTo(game, { questionIndex, phase: "results" }, input.now);
		case "results":
			if (questionIndex + 1 < game.questionCount) {
				return moveTo(
					game,
					{ questionIndex: questionIndex + 1, phase: "questionIntro" },
					input.now,
				);
			}
			// Finished is not "ended": there is no reason, and the PIN is freed.
			return {
				...game,
				status: "finished",
				progress: null,
				endedAt: input.now,
				endReason: null,
			};
	}
}

/** Everybody answered: the results come without waiting for the time (RN-10). */
export function closeAnswers(game: PlayingGame, now: Date): Game {
	return moveTo(
		game,
		{ questionIndex: game.progress.questionIndex, phase: "results" },
		now,
	);
}

/**
 * An answer counts if it reaches the server while that question is being
 * answered and within its time limit, plus the grace (RN-18). It holds with
 * the host's screen closed: the deadline is the server's (RN-13).
 */
export function acceptsAnswers(
	game: Game,
	input: { questionIndex: number; timeLimitSeconds: number; now: Date },
): boolean {
	return (
		isAtStage(game, {
			questionIndex: input.questionIndex,
			phase: "answering",
		}) &&
		isPlaying(game) &&
		elapsedMs(game.progress, input.now) <=
			input.timeLimitSeconds * 1000 + ANSWER_GRACE_MS
	);
}

/** From the answers opening to the server receiving the answer (RN-18). */
export function responseTimeOf(
	progress: GameProgress,
	timeLimitSeconds: number,
	now: Date,
): number {
	return Math.min(elapsedMs(progress, now), timeLimitSeconds * 1000);
}
