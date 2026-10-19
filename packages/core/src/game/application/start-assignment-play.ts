import { GameEndedError, isGameOpen } from "../domain/game";
import {
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

export type StartAssignmentPlay = (
	input: ParticipantReference,
) => Promise<AssignmentPlayView>;

/**
 * "Começar" after choosing the character (spec 030, RN-06): the first
 * question starts now. Pressed again, it gives the screen the participant is
 * already on.
 */
export function createStartAssignmentPlay(
	deps: AssignmentPlayDeps,
): StartAssignmentPlay {
	return async (participant) => {
		const loaded = await loadParticipant(deps, participant);
		const { game, player } = loaded;
		if (player.progress.phase !== "ready") {
			if (player.progress.phase === "finished") {
				throw new ParticipantNotAtStageError("The participant has finished");
			}
			return buildAssignmentPlayView(deps, loaded);
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
			return buildAssignmentPlayView(
				deps,
				await loadParticipant(deps, participant),
			);
		}
		return buildAssignmentPlayView(deps, {
			...loaded,
			player: { ...player, progress: next },
		});
	};
}
