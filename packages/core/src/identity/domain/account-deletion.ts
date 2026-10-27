import { characterCount } from "../../shared/domain/text-length";
import { InvalidDeletionRequestError } from "./account-errors";

/** "Motivo para excluir a conta", in the screen's order (spec 039, RN-37). */
export const ACCOUNT_DELETION_REASONS = [
	"otherAccount",
	"newProfile",
	"thoughtNeededAccountToPlay",
	"missingFeatures",
	"technicalProblems",
	"notUsing",
	"notWhatExpected",
	"other",
] as const;

export type AccountDeletionReason = (typeof ACCOUNT_DELETION_REASONS)[number];

/** The optional feedback (RN-36). */
export const DELETION_FEEDBACK_MAX_LENGTH = 1000;

/**
 * How the account owner confirms: the password, or the account's email when
 * the account only signs in with Google (RN-38).
 */
export type AccountDeletionConfirmation =
	| { kind: "password"; password: string }
	| { kind: "email"; email: string };

export interface DeletionRequest {
	reason: AccountDeletionReason;
	feedback: string | null;
}

export function parseDeletionRequest(input: {
	reason: string;
	feedback?: string | null;
}): DeletionRequest {
	const reason = ACCOUNT_DELETION_REASONS.find((each) => each === input.reason);
	if (!reason) {
		throw new InvalidDeletionRequestError(
			`Unknown deletion reason "${input.reason}"`,
		);
	}
	const feedback = input.feedback?.trim() ?? "";
	if (characterCount(feedback) > DELETION_FEEDBACK_MAX_LENGTH) {
		throw new InvalidDeletionRequestError(
			`Feedback must have at most ${DELETION_FEEDBACK_MAX_LENGTH} characters`,
		);
	}
	return { reason, feedback: feedback === "" ? null : feedback };
}
