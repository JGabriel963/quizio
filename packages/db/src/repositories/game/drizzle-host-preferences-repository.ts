import type { HostPreferencesRepository } from "@quizio/core/game/application/ports/host-preferences-repository";
import { eq } from "drizzle-orm";

import { hostPreferences } from "../../schema/game";
import type { Database } from "../../types";

export function createDrizzleHostPreferencesRepository(
	db: Database,
	/** When a row was last written; only the row's own bookkeeping. */
	now: () => Date = () => new Date(),
): HostPreferencesRepository {
	return {
		async find(ownerId) {
			const [row] = await db
				.select({
					showQuestionsOnDevices: hostPreferences.showQuestionsOnDevices,
					randomizeQuestions: hostPreferences.randomizeQuestions,
					randomizeAnswers: hostPreferences.randomizeAnswers,
				})
				.from(hostPreferences)
				.where(eq(hostPreferences.ownerId, ownerId))
				.limit(1);
			return row ?? null;
		},

		async save(ownerId, options) {
			const fields = {
				showQuestionsOnDevices: options.showQuestionsOnDevices,
				randomizeQuestions: options.randomizeQuestions,
				randomizeAnswers: options.randomizeAnswers,
				updatedAt: now(),
			};
			await db
				.insert(hostPreferences)
				.values({ ownerId, ...fields })
				.onConflictDoUpdate({ target: hostPreferences.ownerId, set: fields });
		},
	};
}
