import {
	SCOREBOARD_SIZE,
	type ScoreboardEntry,
	type Standing,
	scoreboardEntryOf,
} from "./standings";

/** "Pontuações" of an assignment, as one participant sees it (spec 030). */
export interface AssignmentScoreboard {
	/** The first five (RN-15). */
	top: ScoreboardEntry[];
	/** The viewer's own row when outside the five; null otherwise. */
	viewer: ScoreboardEntry | null;
}

/**
 * Everybody by their current total, wherever they are in the activity
 * (RN-14). `previous` are the same standings without the viewer's last
 * answer: who climbed since then gets the arrow, as on the live scoreboard.
 */
export function assignmentScoreboard(
	standings: readonly Standing[],
	previous: readonly Standing[],
	viewerId: string,
): AssignmentScoreboard {
	const top = standings
		.slice(0, SCOREBOARD_SIZE)
		.map((standing) => scoreboardEntryOf(standing, previous));
	const own = standings.find(({ playerId }) => playerId === viewerId);
	const inTop = top.some(({ playerId }) => playerId === viewerId);
	return {
		top,
		viewer: own && !inTop ? scoreboardEntryOf(own, previous) : null,
	};
}
