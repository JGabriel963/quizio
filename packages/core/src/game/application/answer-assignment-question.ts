import {
	AnswersClosedError,
	gradeAnswer,
	parseAnswerResponse,
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
		/** The marked answers; or, for a type answer, the typed `text` (spec 031). */
		choiceIds?: string[];
		text?: string;
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
	return async ({ questionIndex, choiceIds, text, ...participant }) => {
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
		const response = parseAnswerResponse(question, { choiceIds, text });
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
			choiceIds: response.choiceIds,
			text: response.text,
			responseTimeMs,
			...gradeAnswer(question, response, responseTimeMs),
			receivedAt: now,
			reviewedAt: null,
		});
		if (added === "alreadyAnswered") {
			// An earlier request stored it and its progress stayed behind: the
			// answer is in, so the question goes to its results anyway.
			await leaveAnsweredQuestion(deps, player.id, questionIndex, game, now);
			return buildAssignmentPlayView(
				deps,
				await loadParticipant(deps, participant),
			);
		}
		const next = nextProgress(player.progress, game.questionCount, now);
		if (await deps.players.saveProgressIfAt(player.id, player.progress, next)) {
			return buildAssignmentPlayView(deps, {
				...loaded,
				player: { ...player, progress: next },
			});
		}
		// Something moved the progress in between (a resume restarts the time):
		// the answer is stored, so its results come from where it is now.
		await leaveAnsweredQuestion(deps, player.id, questionIndex, game, now);
		return buildAssignmentPlayView(
			deps,
			await loadParticipant(deps, participant),
		);
	};
}

/**
 * Takes a participant whose answer to `questionIndex` is stored to its
 * results, from whatever their progress says now, unless it already moved on.
 */
async function leaveAnsweredQuestion(
	deps: Pick<AssignmentPlayDeps, "players">,
	playerId: string,
	questionIndex: number,
	game: { questionCount: number },
	now: Date,
): Promise<void> {
	for (let attempt = 0; attempt < 3; attempt++) {
		const current = (await deps.players.findById(playerId))?.progress;
		if (
			!current ||
			!isAtProgress(current, { questionIndex, phase: "answering" })
		) {
			return;
		}
		const next = nextProgress(current, game.questionCount, now);
		if (await deps.players.saveProgressIfAt(playerId, current, next)) {
			return;
		}
	}
}
