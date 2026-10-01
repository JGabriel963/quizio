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
	/** Null during the game intro. */
	question: HostQuestionView | null;
	/** How many players answered the question so far. */
	answerCount: number;
	/** Only in the results. */
	distribution: AnswerDistribution | null;
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
}

export interface HostGameViewDeps {
	players: Pick<PlayerRepository, "listActive">;
	gameQuestions: Pick<GameQuestionRepository, "find">;
	answers: Pick<AnswerRepository, "listByQuestion" | "countByQuestion">;
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

async function loadStageView(
	deps: HostGameViewDeps,
	game: Game,
	known: GameQuestion | null | undefined,
): Promise<HostStageView | null> {
	if (!isPlaying(game)) {
		return null;
	}
	const { progress } = game;
	const { questionIndex, phase } = progress;
	const question =
		phase === "gameIntro"
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
		stage: await loadStageView(deps, game, question),
	};
}
