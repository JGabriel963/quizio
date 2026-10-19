import { GameEndedError, isGameOpen } from "../domain/game";
import {
	isAtProgress,
	nextProgress,
	PARTICIPANT_PHASES,
	ParticipantNotAtStageError,
	type ParticipantPhase,
	type ParticipantProgress,
} from "../domain/participant-progress";
import {
	type AssignmentPlayDeps,
	type AssignmentPlayView,
	buildAssignmentPlayView,
	loadParticipant,
	type ParticipantReference,
} from "./assignment-play-view";

export type AdvanceAssignmentPlay = (
	input: ParticipantReference & {
		/** The screen the device was showing when "→" was pressed. */
		from: { questionIndex: number; phase: ParticipantPhase };
	},
) => Promise<AssignmentPlayView>;

/** Whether the participant is already past `from`: a repeated request. */
function isPast(
	progress: ParticipantProgress,
	from: { questionIndex: number; phase: ParticipantPhase },
): boolean {
	return (
		progress.questionIndex > from.questionIndex ||
		(progress.questionIndex === from.questionIndex &&
			PARTICIPANT_PHASES.indexOf(progress.phase) >
				PARTICIPANT_PHASES.indexOf(from.phase))
	);
}

/**
 * "→" (spec 030, RN-12): from the results to "Pontuações", from there to the
 * next question, whose time starts now, or to the end. Only the screen the
 * device says it leaves moves, once: a repeated request gets the screen the
 * participant is on, and an answering screen is left only by answering.
 */
export function createAdvanceAssignmentPlay(
	deps: AssignmentPlayDeps,
): AdvanceAssignmentPlay {
	return async ({ from, ...participant }) => {
		const loaded = await loadParticipant(deps, participant);
		const { game, player } = loaded;
		if (isPast(player.progress, from)) {
			return buildAssignmentPlayView(deps, loaded);
		}
		if (
			!isAtProgress(player.progress, from) ||
			(from.phase !== "results" && from.phase !== "scoreboard")
		) {
			throw new ParticipantNotAtStageError(
				"The participant is not on this screen",
			);
		}
		if (!isGameOpen(game)) {
			throw new GameEndedError("The assignment has ended");
		}
		const next = nextProgress(
			player.progress,
			game.questionCount,
			deps.clock.now(),
		);
		if (
			!(await deps.players.saveProgressIfAt(player.id, player.progress, next))
		) {
			// Another request moved first: the screen it left the participant on.
			return buildAssignmentPlayView(
				deps,
				await loadParticipant(deps, participant),
			);
		}
		const question =
			next.questionIndex === player.progress.questionIndex
				? loaded.question
				: await deps.gameQuestions.find(game.id, next.questionIndex);
		return buildAssignmentPlayView(deps, {
			game,
			player: { ...player, progress: next },
			question,
		});
	};
}
