/**
 * What deleting an account asks the other contexts, which identity does not
 * import (spec 039, RN-39; ADR 0019). Wired in the API's container.
 */
export interface AccountClosure {
	/**
	 * Ends the open games and assignments of the user's quizzes, of any host,
	 * and the open ones the user hosts, telling the players (RN-39, RN-40).
	 */
	endGames(userId: string): Promise<void>;
	/** Deletes the groups the user administers, with their files (RN-39). */
	deleteManagedGroups(userId: string): Promise<void>;
	/**
	 * The files the user posted or uploaded in other groups: their rows go
	 * with the account, the objects do not.
	 */
	groupFileKeys(userId: string): Promise<string[]>;
}
