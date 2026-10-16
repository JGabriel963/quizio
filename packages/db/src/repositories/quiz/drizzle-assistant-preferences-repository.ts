import type { AssistantPreferencesRepository } from "@quizio/core/quiz/application/ports/assistant-preferences-repository";
import { parseStoredGenerationOptions } from "@quizio/core/quiz/domain/generation";
import { eq } from "drizzle-orm";

import { assistantPreferences } from "../../schema/quiz";
import type { Database } from "../../types";

export function createDrizzleAssistantPreferencesRepository(
	db: Database,
	/** When a row was last written; only the row's own bookkeeping. */
	now: () => Date = () => new Date(),
): AssistantPreferencesRepository {
	return {
		async find(ownerId) {
			const [row] = await db
				.select({ options: assistantPreferences.options })
				.from(assistantPreferences)
				.where(eq(assistantPreferences.ownerId, ownerId))
				.limit(1);
			return row ? parseStoredGenerationOptions(row.options) : null;
		},

		async save(ownerId, options) {
			const values = { options, updatedAt: now() };
			await db
				.insert(assistantPreferences)
				.values({ ownerId, ...values })
				.onConflictDoUpdate({
					target: assistantPreferences.ownerId,
					set: values,
				});
		},
	};
}
