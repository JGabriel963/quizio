import type { AccountDeletionReason } from "../../domain/account-deletion";

/** Kept without anything that points at the account (spec 039, RN-41). */
export interface AccountDeletionFeedback {
	id: string;
	reason: AccountDeletionReason;
	feedback: string | null;
	at: Date;
}

export interface AccountDeletionFeedbackRepository {
	add(entry: AccountDeletionFeedback): Promise<void>;
}
