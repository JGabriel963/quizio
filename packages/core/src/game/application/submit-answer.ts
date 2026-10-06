import type { Clock } from "../../shared/application/ports/clock";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import type { RealtimePublisher } from "../../shared/application/ports/realtime-publisher";
import {
	AlreadyAnsweredError,
	AnswersClosedError,
	answerPoints,
	correctnessOf,
	parseAnswerChoices,
} from "../domain/answer";
import { GameNotFoundError } from "../domain/game";
import { type AnswerCountPayload, GAME_EVENTS } from "../domain/game-events";
import {
	acceptsAnswers,
	closeAnswers,
	isPlaying,
	responseTimeOf,
} from "../domain/game-progress";
import { canAnswer, hasPlayerSecret, isActivePlayer } from "../domain/player";
import { loadGame, publishStage, publishToGame } from "./game-lifecycle";
import type { AnswerRepository } from "./ports/answer-repository";
import type { GameQuestionRepository } from "./ports/game-question-repository";
import type { GameRepository } from "./ports/game-repository";
import type { PlayerRepository } from "./ports/player-repository";

export type SubmitAnswer = (input: {
	gameId: string;
	playerId: string;
	secret: string;
	/** The question the device was showing: a late tap never lands on the next one. */
	questionIndex: number;
	choiceIds: string[];
}) => Promise<void>;

/**
 * A player's answer (spec 009, RN-14 to RN-21). The time, the correctness and
 * the points (spec 010, RN-07) are worked out here, on receipt; nothing the device says about either is
 * read, and nothing about them goes back.
 */
export function createSubmitAnswer(deps: {
	games: GameRepository;
	players: Pick<PlayerRepository, "findById" | "countEligible">;
	gameQuestions: Pick<GameQuestionRepository, "find">;
	answers: Pick<AnswerRepository, "add" | "countByQuestion">;
	storage: Pick<ObjectStorage, "getPublicUrl">;
	clock: Clock;
	realtime: RealtimePublisher;
}): SubmitAnswer {
	return async ({ gameId, playerId, secret, questionIndex, choiceIds }) => {
		const game = await loadGame(deps, gameId);
		const player = await deps.players.findById(playerId);
		if (
			!game ||
			!player ||
			player.gameId !== game.id ||
			!hasPlayerSecret(player, secret) ||
			!isActivePlayer(player)
		) {
			throw new GameNotFoundError("Player session not found");
		}

		const closed = () =>
			new AnswersClosedError("This question is not taking answers");
		// Who joined after the answers opened waits for the next one (spec 012, RN-13).
		if (!isPlaying(game) || !canAnswer(player, questionIndex)) {
			throw closed();
		}
		const question = await deps.gameQuestions.find(game.id, questionIndex);
		const now = deps.clock.now();
		if (
			!question ||
			!acceptsAnswers(game, {
				questionIndex,
				timeLimitSeconds: question.timeLimitSeconds,
				now,
			})
		) {
			throw closed();
		}

		const chosen = parseAnswerChoices(question, choiceIds);
		const responseTimeMs = responseTimeOf(
			game.progress,
			question.timeLimitSeconds,
			now,
		);
		const added = await deps.answers.add({
			gameId: game.id,
			questionIndex,
			playerId: player.id,
			choiceIds: chosen,
			responseTimeMs,
			correctness: correctnessOf(question, chosen),
			points: answerPoints(question, chosen, responseTimeMs),
			receivedAt: now,
		});
		if (added === "alreadyAnswered") {
			throw new AlreadyAnsweredError(
				"The player already answered this question",
			);
		}

		const count = await deps.answers.countByQuestion(game.id, questionIndex);
		await publishToGame<AnswerCountPayload>(
			deps.realtime,
			game.id,
			GAME_EVENTS.answerCount,
			{ questionIndex, count },
		);

		// Everybody who may answer did: the results do not wait for the time
		// (RN-10; spec 012, RN-16).
		if (count >= (await deps.players.countEligible(game.id, questionIndex))) {
			const results = closeAnswers(game, now);
			const from = { questionIndex, phase: "answering" as const };
			if (await deps.games.saveIfAt(results, from)) {
				await publishStage(deps, results, question);
			}
		}
	};
}
