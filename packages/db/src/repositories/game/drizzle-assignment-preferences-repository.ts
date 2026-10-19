import type { AssignmentPreferencesRepository } from "@quizio/core/game/application/ports/assignment-preferences-repository";
import { eq } from "drizzle-orm";

import { assignmentPreferences } from "../../schema/game";
import type { Database } from "../../types";

export function createDrizzleAssignmentPreferencesRepository(
	db: Database,
	/** When a row was last written; only the row's own bookkeeping. */
	now: () => Date = () => new Date(),
): AssignmentPreferencesRepository {
	return {
		async find(ownerId) {
			const [row] = await db
				.select({
					gameCharacters: assignmentPreferences.gameCharacters,
					questionTimer: assignmentPreferences.questionTimer,
					randomizeAnswers: assignmentPreferences.randomizeAnswers,
				})
				.from(assignmentPreferences)
				.where(eq(assignmentPreferences.ownerId, ownerId))
				.limit(1);
			return row ?? null;
		},

		async save(ownerId, options) {
			// All three come from one dialog, saved together (spec 029, RN-14).
			const columns = { ...options, updatedAt: now() };
			await db
				.insert(assignmentPreferences)
				.values({ ownerId, ...columns })
				.onConflictDoUpdate({
					target: assignmentPreferences.ownerId,
					set: columns,
				});
		},
	};
}
