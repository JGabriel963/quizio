import type { AssignmentOptions } from "../../domain/assignment";

/**
 * The options a creator chose in the last assignment, which the next one
 * starts with (spec 029, RN-14). Apart from the live game's preferences.
 */
export interface AssignmentPreferencesRepository {
	/** Null for a creator who never assigned. */
	find(ownerId: string): Promise<AssignmentOptions | null>;
	save(ownerId: string, options: AssignmentOptions): Promise<void>;
}
