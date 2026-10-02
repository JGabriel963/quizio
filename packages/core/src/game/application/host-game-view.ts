import type { QuestionType, SelectionMode } from "../../quiz/domain/question";
import type {
	ImageCrop,
	ImagePlacement,
} from "../../quiz/domain/question-image";
import type { Clock } from "../../shared/application/ports/clock";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { type AnswerDistribution, answerDistribution } from "../domain/answer";
import type { Game, GameEndReason, GameStatus } from "../domain/game";
import {
	type GamePhase,
	isPlaying,
	phaseDurationMs,
	remainingMsOf,
} from "../domain/game-progress";
import type { GameQuestion } from "../domain/game-question";
import type { Player } from "../domain/player";
import { podiumRevealRemainingMs } from "../domain/podium";
import {
	rankPlayers,
	type ScoreboardEntry,
	type Standing,
	scoreboardLeavers,
	scoreboardOf,
} from "../domain/standings";
import type { AnswerRepository } from "./ports/answer-repository";
import type { GameQuestionRepository } from "./ports/game-question-repository";
import type { PlayerRepository } from "./ports/player-repository";

export interface LobbyPlayerView {
	id: string;
	nickname: string;
}

export interface HostChoiceView {
	id: string;
	shapeIndex: number;
	text: string;
	/**
	 * Null until the results: the host's screen is projected, so the right
	 * answer does not reach the page before it is revealed (spec 009, RN-21).
	 */
	correct: boolean | null;
}

export interface HostImageView {
	url: string;
	placement: ImagePlacement;
	crop: ImageCrop | null;
	altText: string | null;
}

export interface HostQuestionView {
	type: QuestionType;
	selection: SelectionMode;
	text: string;
	choices: HostChoiceView[];
	image: HostImageView | null;
}

/** Where a game in progress is, as its host sees it (spec 009, RN-07 to RN-11). */
export interface HostStageView {
	questionIndex: number;
	phase: GamePhase;
	/** By the server's clock when the view was made; null for the results. */
	remainingMs: number | null;
	durationMs: number | null;
	/** Null during the game intro and in the scoreboard, which show none. */
	question: HostQuestionView | null;
	/** How many players answered the question so far. */
	answerCount: number;
	/** Only in the results. */
	distribution: AnswerDistribution | null;
	/** The first five and who climbed; only in the scoreboard (spec 010). */
	scoreboard: ScoreboardEntry[] | null;
	/** Who was among the five before the question; only in the scoreboard (spec 011). */
	scoreboardLeavers: ScoreboardEntry[] | null;
}

/** The end of a game that played every question (spec 011). */
export interface HostFinalView {
	/** Everybody, the first one first (RN-05); the podium is the first three. */
	standings: Standing[];
	/** Left of the podium's reveal by the server's clock; 0 once it is over (RN-10, RN-11). */
	revealRemainingMs: number;
}

/** Everything the host's screen shows, in the lobby and during the game. */
export interface HostGameView {
	gameId: string;
	quizId: string;
	title: string;
	pin: string;
	status: GameStatus;
	endReason: GameEndReason | null;
	locked: boolean;
	/** Active players, in order of arrival. */
	players: LobbyPlayerView[];
	questionCount: number;
	/** Null unless the game is being played. */
	stage: HostStageView | null;
	/** Null unless the game is finished: one ended before that has no podium (RN-04). */
	final: HostFinalView | null;
}

export interface HostGameViewDeps {
	players: Pick<PlayerRepository, "listActive">;
	gameQuestions: Pick<GameQuestionRepository, "find">;
	answers: Pick<
		AnswerRepository,
		"listByQuestion" | "countByQuestion" | "totalsThrough"
	>;
	storage: Pick<ObjectStorage, "getPublicUrl">;
	clock: Clock;
}

export function toLobbyPlayerView(player: Player): LobbyPlayerView {
	return { id: player.id, nickname: player.nickname };
}

function toQuestionView(
	question: GameQuestion,
	revealed: boolean,
	storage: Pick<ObjectStorage, "getPublicUrl">,
): HostQuestionView {
	return {
		type: question.type,
		selection: question.selection,
		text: question.text,
		choices: question.choices.map((choice) => ({
			id: choice.id,
			shapeIndex: choice.shapeIndex,
			text: choice.text,
			correct: revealed ? choice.correct : null,
		})),
		image: question.image && {
			url: storage.getPublicUrl(question.image.key),
			placement: question.image.placement,
			crop: question.image.crop,
			altText: question.image.altText,
		},
	};
}

/** Everybody by total after `questionIndex`: nothing but the answers stores a total (spec 010). */
async function standingsAfter(
	deps: HostGameViewDeps,
	gameId: string,
	players: readonly Player[],
	questionIndex: number,
): Promise<Standing[]> {
	return rankPlayers(
		players,
		await deps.answers.totalsThrough(gameId, questionIndex),
	);
}

/**
 * The first five after `questionIndex`, with who climbed since the question
 * before and who left the five (spec 010; spec 011, RN-28, RN-31).
 */
async function loadScoreboard(
	deps: HostGameViewDeps,
	gameId: string,
	players: readonly Player[],
	questionIndex: number,
): Promise<{ entries: ScoreboardEntry[]; leavers: ScoreboardEntry[] }> {
	const current = await standingsAfter(deps, gameId, players, questionIndex);
	const previous =
		questionIndex > 0
			? await standingsAfter(deps, gameId, players, questionIndex - 1)
			: null;
	return {
		entries: scoreboardOf(current, previous),
		leavers: scoreboardLeavers(current, previous),
	};
}

/** The final standings of a finished game: they do not change anymore (spec 011, RN-07). */
async function loadFinalView(
	deps: HostGameViewDeps,
	game: Game,
	players: readonly Player[],
): Promise<HostFinalView | null> {
	if (game.status !== "finished") {
		return null;
	}
	return {
		standings: await standingsAfter(
			deps,
			game.id,
			players,
			game.questionCount - 1,
		),
		revealRemainingMs: podiumRevealRemainingMs(game, deps.clock.now()),
	};
}

async function loadStageView(
	deps: HostGameViewDeps,
	game: Game,
	players: readonly Player[],
	known: GameQuestion | null | undefined,
): Promise<HostStageView | null> {
	if (!isPlaying(game)) {
		return null;
	}
	const { progress } = game;
	const { questionIndex, phase } = progress;
	const question =
		phase === "gameIntro" || phase === "scoreboard"
			? null
			: known?.index === questionIndex
				? known
				: await deps.gameQuestions.find(game.id, questionIndex);
	const timeLimitSeconds = question?.timeLimitSeconds ?? 0;
	const revealed = phase === "results";
	const answers =
		revealed && question
			? await deps.answers.listByQuestion(game.id, questionIndex)
			: null;
	const scoreboard =
		phase === "scoreboard"
			? await loadScoreboard(deps, game.id, players, questionIndex)
			: null;

	return {
		questionIndex,
		phase,
		remainingMs: remainingMsOf(progress, timeLimitSeconds, deps.clock.now()),
		durationMs: phaseDurationMs(phase, timeLimitSeconds),
		question: question && toQuestionView(question, revealed, deps.storage),
		answerCount: answers
			? answers.length
			: phase === "answering"
				? await deps.answers.countByQuestion(game.id, questionIndex)
				: 0,
		distribution:
			answers && question ? answerDistribution(question, answers) : null,
		scoreboard: scoreboard?.entries ?? null,
		scoreboardLeavers: scoreboard?.leavers ?? null,
	};
}

/**
 * The host's view of a game as it is stored. `question` spares a read when
 * the caller already has the question of the game's stage.
 */
export async function loadHostGameView(
	deps: HostGameViewDeps,
	game: Game,
	question?: GameQuestion | null,
): Promise<HostGameView> {
	const players = await deps.players.listActive(game.id);
	return {
		gameId: game.id,
		quizId: game.quizId,
		title: game.title,
		pin: game.pin,
		status: game.status,
		endReason: game.endReason,
		locked: game.locked,
		players: players.map(toLobbyPlayerView),
		questionCount: game.questionCount,
		stage: await loadStageView(deps, game, players, question),
		final: await loadFinalView(deps, game, players),
	};
}
