import {
	type AssignmentPlayDeps,
	type AssignmentPlayView,
	buildAssignmentPlayView,
	loadParticipant,
	type ParticipantReference,
} from "./assignment-play-view";

export type GetAssignmentPlay = (
	input: ParticipantReference,
) => Promise<AssignmentPlayView>;

/**
 * Where a participant is and what their screen shows (spec 030): asked on
 * opening the activity, when the time of a question runs out on the device and
 * when the device comes back (RN-20, RN-21).
 */
export function createGetAssignmentPlay(
	deps: AssignmentPlayDeps,
): GetAssignmentPlay {
	return async (input) =>
		buildAssignmentPlayView(deps, await loadParticipant(deps, input));
}
