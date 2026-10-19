import {
	AnswersClosedError,
	answerPoints,
	correctnessOf,
	parseAnswerChoices,
} from "../domain/answer";
import { GameEndedError, isGameOpen } from "../domain/game";
import {
	answerDeadline,
	isAtProgress,
	nextProgress,
	ParticipantNotAtStageError,
} from "../domain/participant-progress";
import {
	type AssignmentPlayDeps,
	type AssignmentPlayView,
	buildAssignmentPlayView,
	loadParticipant,
	type ParticipantReference,
} from "./assignment-play-view";
import type { AnswerRepository } from "./ports/answer-repository";

export type AnswerAssignmentQuestion = (
	input: ParticipantReference & {
		/** The question the device was showing: a late tap never lands on another one. */
		questionIndex: number;
		choiceIds: string[];
	},
) => Promise<AssignmentPlayView>;

/**
 * A participant's answer (spec 030, RN-10, RN-11, RN-13). The time and the
 * correctness are the server's, from when the question was shown to them;
 * without the question timer an answer takes no time, so a right one is worth
 * the full points. The participant then sees the results.
 */
export function createAnswerAssignmentQuestion(
	deps: AssignmentPlayDeps & {
		answers: Pick<AnswerRepository, "add" | "listByPlayer" | "totalsThrough">;
	},
): AnswerAssignmentQuestion {
	return async ({ questionIndex, choiceIds, ...participant }) => {
		const loaded = await loadParticipant(deps, participant);
		const { game, player, question } = loaded;
		if (!isGameOpen(game)) {
			throw new GameEndedError("The assignment has ended");
		}
		if (
			!question ||
			!isAtProgress(player.progress, { questionIndex, phase: "answering" })
		) {
			// Past its time, `loadParticipant` already took it to the results.
			if (
				question &&
				isAtProgress(player.progress, { questionIndex, phase: "results" }) &&
				!(await deps.answers.listByPlayer(game.id, player.id)).some(
					(answer) => answer.questionIndex === questionIndex,
				)
			) {
				throw new AnswersClosedError("The time of the question is over");
			}
			throw new ParticipantNotAtStageError(
				"The participant is not answering this question",
			);
		}
		const chosen = parseAnswerChoices(question, choiceIds);
		const now = deps.clock.now();
		const deadline = answerDeadline(game, question, player.progress);
		if (deadline && now.getTime() >= deadline.getTime()) {
			throw new AnswersClosedError("The time of the question is over");
		}
		const responseTimeMs = game.questionTimer
			? now.getTime() - player.progress.startedAt.getTime()
			: 0;
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
			throw new ParticipantNotAtStageError("The question was already answered");
		}
		const next = nextProgress(player.progress, game.questionCount, now);
		await deps.players.saveProgressIfAt(player.id, player.progress, next);
		return buildAssignmentPlayView(deps, {
			...loaded,
			player: { ...player, progress: next },
		});
	};
}
