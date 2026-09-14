import { DomainError } from "../../shared/domain/domain-error";
import { characterCount } from "../../shared/domain/text-length";

/**
 * Account rules for creators (spec 001, RN-02). Identity itself is delegated
 * to Better Auth; these rules are shared by its sign-up hook and the web form.
 */
export const CREATOR_NAME_LENGTH = { min: 2, max: 50 } as const;

export const PASSWORD_LENGTH = { min: 8, max: 128 } as const;

export class InvalidCreatorNameError extends DomainError {
	readonly code = "IDENTITY.INVALID_NAME";
}

export function normalizeCreatorName(name: string): string {
	return name.trim();
}

export function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

export function assertCreatorName(name: string): void {
	const length = characterCount(normalizeCreatorName(name));
	if (length < CREATOR_NAME_LENGTH.min || length > CREATOR_NAME_LENGTH.max) {
		throw new InvalidCreatorNameError(
			`Creator name must have ${CREATOR_NAME_LENGTH.min} to ${CREATOR_NAME_LENGTH.max} characters, received ${length}`,
		);
	}
}
