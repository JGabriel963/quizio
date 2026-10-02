import type { Clock } from "../../shared/application/ports/clock";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import type { Answer, Correctness } from "../domain/answer";
import { type Game, GameNotFoundError } from "../domain/game";
import {
	isPlaying,
	type PlayingGame,
	remainingMsOf,
	revealedThrough,
} from "../domain/game-progress";
import type { GameQuestion } from "../domain/game-question";
import { hostIdleMs } from "../domain/host-presence";
import {
	canAnswer,
	hasPlayerSecret,
	isActivePlayer,
	type Player,
} from "../domain/player";
import { podiumRevealRemainingMs } from "../domain/podium";
import { type PublicStage, publicStageOf } from "../domain/public-stage";
import { rankPlayers, standingOf, streakAfter } from "../domain/standings";
import { loadGame } from "./game-lifecycle";
import type { AnswerRepository } from "./ports/answer-repository";
import type { GameQuestionRepository } from "./ports/game-question-repository";
import type { GameRepository } from "./ports/game-repository";
import type { PlayerRepository } from "./ports/player-repository";

/**
 * `removed` wins over the rest: the player was told to leave first. `finished`
 * played every question; `ended` was closed before that (spec 009, RN-30).
 */
export type PlayerSessionStatus =
	| "waiting"
	| "playing"
	| "finished"
	| "removed"
	| "ended";

/** How the player did in a question; `timeout` is having sent nothing (RN-25). */
export type PlayerResult = Correctness | "timeout";

/** What a question left the player with, told at its results (spec 010, RN-12 to RN-15). */
export interface PlayerOutcome {
	result: PlayerResult;
	/** Points of the answer; null in a question that gives none (RN-14). */
	points: number | null;
	/** Questions in a row answered right, this one included. */
	streak: number;
	/** The player's place after the question. */
	rank: number;
	/** Who is right ahead, and by how much; null for the first. */
	behind: { nickname: string; points: number } | null;
}

/**
 * A stage as one player's device shows it: the public part plus what is this
 * player's alone. Never which answer was right (spec 009, RN-21, RN-26); the
 * question's text and the answer texts only with the questions on the devices
 * (spec 012, RN-18).
 */
export interface PlayerStageView extends PublicStage {
	/** By the server's clock when the view was made; null for the results. */
	remainingMs: number | null;
	/**
	 * The player joined after this question's answers opened and waits for the
	 * next one: no question, no answer and no outcome (spec 012, RN-13, RN-14).
	 */
	sittingOut: boolean;
	answered: boolean;
	/**
	 * Sum of the points already revealed (spec 010, RN-16): an answer just sent
	 * is not in it until the results (RN-09).
	 */
	total: number;
	/** Only in the results and the scoreboard. */
	outcome: PlayerOutcome | null;
}

/** How the game ended for one player (spec 011, RN-18 to RN-21). */
export interface PlayerFinalView {
	/** The quiz's title, as the game keeps it. */
	title: string;
	/** The player's place in the final standings: nobody shares one (RN-05). */
	rank: number;
	total: number;
	/** Left of the podium's reveal on the host's screen; the device waits for it (RN-18). */
	revealRemainingMs: number;
}

export interface PlayerSessionView {
	gameId: string;
	nickname: string;
	status: PlayerSessionStatus;
	/** Null unless the game is being played. */
	stage: PlayerStageView | null;
	/** Null unless the game is finished and the player was in it to the end. */
	final: PlayerFinalView | null;
	/**
	 * How long ago the host's screen last gave a sign, by the server's clock
	 * (spec 013, RN-14); null when the player is not waiting for the host
	 * anymore: removed, or the game is over.
	 */
	hostIdleMs: number | null;
}

export type GetPlayerSession = (input: {
	gameId: string;
	playerId: string;
	secret: string;
}) => Promise<PlayerSessionView>;

function statusOf(game: Game, player: Player): PlayerSessionStatus {
	if (!isActivePlayer(player)) {
		return "removed";
	}
	return game.status === "lobby" ? "waiting" : game.status;
}

/**
 * What the player's device should be showing, asked with the pair it got when
 * joining (ADR 0009). It is how a device that missed an event, or was
 * reloaded, catches up (spec 008, RN-44, RN-46; spec 009, RN-32, RN-33).
 */
export function createGetPlayerSession(deps: {
	games: GameRepository;
	players: Pick<PlayerRepository, "findById" | "listActive">;
	gameQuestions: Pick<GameQuestionRepository, "find">;
	answers: Pick<AnswerRepository, "listByPlayer" | "totalsThrough">;
	storage: Pick<ObjectStorage, "getPublicUrl">;
	clock: Clock;
}): GetPlayerSession {
	/** Told once the question's results are out, and kept through its scoreboard. */
	async function outcomeOf(
		game: PlayingGame,
		player: Player,
		question: GameQuestion | null,
		ownAnswers: readonly Answer[],
	): Promise<PlayerOutcome> {
		const { questionIndex } = game.progress;
		const answer = ownAnswers.find(
			(entry) => entry.questionIndex === questionIndex,
		);
		const standings = rankPlayers(
			await deps.players.listActive(game.id),
			await deps.answers.totalsThrough(game.id, questionIndex),
		);
		const standing = standingOf(standings, player.id);
		return {
			result: answer?.correctness ?? "timeout",
			points: question?.points === "noPoints" ? null : (answer?.points ?? 0),
			streak: streakAfter(ownAnswers, questionIndex),
			rank: standing?.rank ?? standings.length,
			behind: standing?.behind ?? null,
		};
	}

	async function stageOf(
		game: Game,
		player: Player,
	): Promise<PlayerStageView | null> {
		if (!isPlaying(game) || !isActivePlayer(player)) {
			return null;
		}
		const { progress } = game;
		const { questionIndex, phase } = progress;
		const question =
			phase === "gameIntro"
				? null
				: await deps.gameQuestions.find(game.id, questionIndex);
		const ownAnswers = await deps.answers.listByPlayer(game.id, player.id);
		const revealed = revealedThrough(progress);
		const sittingOut = !canAnswer(player, questionIndex);
		const told = !sittingOut && (phase === "results" || phase === "scoreboard");
		const stage = publicStageOf(game, question, (key) =>
			deps.storage.getPublicUrl(key),
		);

		return {
			...stage,
			question: sittingOut ? null : stage.question,
			remainingMs: remainingMsOf(
				progress,
				question?.timeLimitSeconds ?? 0,
				deps.clock.now(),
			),
			sittingOut,
			answered:
				phase !== "gameIntro" &&
				phase !== "questionIntro" &&
				ownAnswers.some((answer) => answer.questionIndex === questionIndex),
			total: ownAnswers
				.filter((answer) => answer.questionIndex <= revealed)
				.reduce((sum, answer) => sum + answer.points, 0),
			outcome: told
				? await outcomeOf(game, player, question, ownAnswers)
				: null,
		};
	}

	async function finalOf(
		game: Game,
		player: Player,
	): Promise<PlayerFinalView | null> {
		if (game.status !== "finished" || !isActivePlayer(player)) {
			return null;
		}
		const standing = standingOf(
			rankPlayers(
				await deps.players.listActive(game.id),
				await deps.answers.totalsThrough(game.id, game.questionCount - 1),
			),
			player.id,
		);
		return (
			standing && {
				title: game.title,
				rank: standing.rank,
				total: standing.total,
				revealRemainingMs: podiumRevealRemainingMs(game, deps.clock.now()),
			}
		);
	}

	return async ({ gameId, playerId, secret }) => {
		const game = await loadGame(deps, gameId);
		const player = await deps.players.findById(playerId);
		if (
			!game ||
			!player ||
			player.gameId !== game.id ||
			!hasPlayerSecret(player, secret)
		) {
			throw new GameNotFoundError("Player session not found");
		}
		return {
			gameId: game.id,
			nickname: player.nickname,
			status: statusOf(game, player),
			stage: await stageOf(game, player),
			final: await finalOf(game, player),
			hostIdleMs: isActivePlayer(player)
				? hostIdleMs(game, deps.clock.now())
				: null,
		};
	};
}
