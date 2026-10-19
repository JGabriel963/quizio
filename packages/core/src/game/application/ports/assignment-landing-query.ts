/** What the activity's screen shows of an assignment (spec 029, RN-46, RN-47). */
export interface AssignmentLandingRecord {
	gameId: string;
	/** The report's own name, or the game's title (RN-28). */
	name: string;
	creatorName: string;
	expiresAt: Date;
	endedAt: Date | null;
	/** Players who were not removed. */
	participantCount: number;
}

/**
 * Read model for the participants' screen: it joins what the game, the report
 * and the creator's account each keep.
 */
export interface AssignmentLandingQuery {
	/** Only assignments: null for an unknown id or a live game. */
	find(gameId: string): Promise<AssignmentLandingRecord | null>;
}
