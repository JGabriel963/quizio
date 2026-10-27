import type { AccountDeletionFeedbackRepository } from "@quizio/core/identity/application/ports/account-deletion-feedback-repository";

import { accountDeletionFeedback } from "../../schema/identity";
import type { Database } from "../../types";

/** Without anything that points at the account (spec 039, RN-41). */
export function createDrizzleAccountDeletionFeedback(
	db: Database,
): AccountDeletionFeedbackRepository {
	return {
		async add({ id, reason, feedback, at }) {
			await db
				.insert(accountDeletionFeedback)
				.values({ id, reason, feedback, createdAt: at });
		},
	};
}
