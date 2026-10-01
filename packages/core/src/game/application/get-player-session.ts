import type { Clock } from "../../shared/application/ports/clock";
import type { Correctness } from "../domain/answer";
import { type Game, GameNotFoundError } from "../domain/game";
import { isPlaying, remainingMsOf } from "../domain/game-progress";
import { hasPlayerSecret, isActivePlayer, type Player } from "../domain/player";
import { type PublicStage, publicStageOf } from "../domain/public-stage";
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

/**
 * A stage as one player's device shows it: the public part plus what is this
 * player's alone. Never the question text, the answer texts or which answer
 * was right (spec 009, RN-14, RN-21, RN-26).
 */
export interface PlayerStageView extends PublicStage {
	/** By the server's clock when the view was made; null for the results. */
	remainingMs: number | null;
	answered: boolean;
	/** Only in the results. */
	result: PlayerResult | null;
}

export interface PlayerSessionView {
	gameId: string;
	nickname: string;
	status: PlayerSessionStatus;
	/** Null unless the game is being played. */
	stage: PlayerStageView | null;
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
	players: Pick<PlayerRepository, "findById">;
	gameQuestions: Pick<GameQuestionRepository, "find">;
	answers: Pick<AnswerRepository, "find">;
	clock: Clock;
}): GetPlayerSession {
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
		const answer =
			phase === "answering" || phase === "results"
				? await deps.answers.find(game.id, questionIndex, player.id)
				: null;
		return {
			...publicStageOf(game, question),
			remainingMs: remainingMsOf(
				progress,
				question?.timeLimitSeconds ?? 0,
				deps.clock.now(),
			),
			answered: answer !== null,
			result: phase === "results" ? (answer?.correctness ?? "timeout") : null,
		};
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
		};
	};
}
