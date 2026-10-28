import type { AttemptLimiter } from "../../shared/application/ports/attempt-limiter";
import type { Clock } from "../../shared/application/ports/clock";
import type { IdGenerator } from "../../shared/application/ports/id-generator";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import {
	mediaPrefixOf,
	profilePhotoPrefixOf,
	sourcesPrefixOf,
	themesPrefixOf,
} from "../../shared/domain/media-key";
import {
	type AccountDeletionConfirmation,
	parseDeletionRequest,
} from "../domain/account-deletion";
import {
	CreatorProfileNotFoundError,
	EmailMismatchError,
	TooManyAttemptsError,
	WrongPasswordError,
} from "../domain/account-errors";
import { normalizeEmail } from "../domain/sign-up-rules";
import type { AccountClosure } from "./ports/account-closure";
import type { AccountCredentials } from "./ports/account-credentials";
import type { AccountDeletionFeedbackRepository } from "./ports/account-deletion-feedback-repository";
import type {
	AccountRecord,
	AccountRepository,
} from "./ports/account-repository";

/** As many wrong passwords as signing in allows (spec 039, RN-23). */
export const DELETE_ATTEMPT_LIMIT = 5;
export const DELETE_ATTEMPT_WINDOW_MS = 60_000;

export type DeleteAccount = (input: {
	userId: string;
	reason: string;
	feedback?: string | null;
	confirmation: AccountDeletionConfirmation;
}) => Promise<void>;

/**
 * "Excluir conta" (spec 039, RN-38 to RN-41; ADR 0019). The database
 * cascades most of it from the account row; this does what it cannot: the
 * players are told their games ended, the managed groups go the usual way,
 * and the files go after the rows. Every step can run again, so a failure
 * halfway leaves something to retry, never an account half there.
 */
export function createDeleteAccount(deps: {
	accounts: AccountRepository;
	credentials: AccountCredentials;
	accountClosure: AccountClosure;
	deletionFeedback: AccountDeletionFeedbackRepository;
	attempts: AttemptLimiter;
	storage: ObjectStorage;
	ids: IdGenerator;
	clock: Clock;
}): DeleteAccount {
	async function confirm(
		account: AccountRecord,
		confirmation: AccountDeletionConfirmation,
		now: Date,
	): Promise<void> {
		if (!(await deps.credentials.hasPassword(account.id))) {
			if (
				confirmation.kind !== "email" ||
				normalizeEmail(confirmation.email) !== normalizeEmail(account.email)
			) {
				throw new EmailMismatchError("The typed email is not the account's");
			}
			return;
		}
		if (confirmation.kind !== "password") {
			throw new WrongPasswordError("This account confirms with its password");
		}
		const attemptKey = `account-delete:${account.id}`;
		const allowed = await deps.attempts.reserve(
			attemptKey,
			DELETE_ATTEMPT_WINDOW_MS,
			DELETE_ATTEMPT_LIMIT,
			now,
		);
		if (!allowed) {
			throw new TooManyAttemptsError("Too many wrong passwords; wait a moment");
		}
		if (
			!(await deps.credentials.verifyPassword(
				account.id,
				confirmation.password,
			))
		) {
			throw new WrongPasswordError("Wrong password");
		}
		await deps.attempts.release(attemptKey, DELETE_ATTEMPT_WINDOW_MS, now);
	}

	return async ({ userId, confirmation, ...request }) => {
		const { reason, feedback } = parseDeletionRequest(request);
		const account = await deps.accounts.find(userId);
		if (!account) {
			throw new CreatorProfileNotFoundError(`No account ${userId}`);
		}
		const now = deps.clock.now();
		await confirm(account, confirmation, now);

		// Nothing in it points at the account (RN-41).
		await deps.deletionFeedback.add({
			id: deps.ids.generate(),
			reason,
			feedback,
			at: now,
		});
		await deps.accountClosure.endGames(userId);
		await deps.accountClosure.deleteManagedGroups(userId);
		const groupFiles = await deps.accountClosure.groupFileKeys(userId);
		await deps.accounts.delete(userId);

		await Promise.all([
			...groupFiles.map((key) => deps.storage.delete(key)),
			deps.storage.deletePrefix(mediaPrefixOf(userId)),
			deps.storage.deletePrefix(sourcesPrefixOf(userId)),
			deps.storage.deletePrefix(profilePhotoPrefixOf(userId)),
			// The themes' rows went with the user's (spec 043, RN-30).
			deps.storage.deletePrefix(themesPrefixOf(userId)),
		]);
	};
}
