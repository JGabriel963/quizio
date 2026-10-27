import type {
	AccountDeletionFeedback,
	AccountDeletionFeedbackRepository,
} from "../application/ports/account-deletion-feedback-repository";

export class InMemoryAccountDeletionFeedback
	implements AccountDeletionFeedbackRepository
{
	readonly entries: AccountDeletionFeedback[] = [];

	async add(entry: AccountDeletionFeedback): Promise<void> {
		this.entries.push({ ...entry });
	}
}
