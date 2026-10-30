import {
	type AssignmentPlayDeps,
	loadParticipant,
	type ParticipantReference,
} from "./assignment-play-view";

export type ResumeAssignment = (input: ParticipantReference) => Promise<void>;

/**
 * "Sim" to "Você é {apelido}?" (spec 030, RN-20 to RN-22), with the pair the
 * browser kept when it joined: only that browser goes on as the participant,
 * as in Kahoot, and a nickname alone takes nobody back (M5). Nothing starts
 * again (RN-21, M6): a question's time ran on the server's clock while the
 * participant was away, so they go on with what was left, and one whose time
 * ran out is settled here as unanswered, like every other request does; an
 * ended activity takes them to its end.
 */
export function createResumeAssignment(
	deps: AssignmentPlayDeps,
): ResumeAssignment {
	return async (input) => {
		await loadParticipant(deps, input);
	};
}
