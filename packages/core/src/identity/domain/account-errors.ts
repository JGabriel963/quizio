import { DomainError } from "../../shared/domain/domain-error";
import { NotFoundError } from "../../shared/domain/not-found-error";

/** A reason outside the list or feedback too long (spec 039, RN-36, RN-37). */
export class InvalidDeletionRequestError extends DomainError {
	readonly code = "IDENTITY.INVALID_DELETION_REQUEST";
}

/** The password that confirms deleting the account is wrong (RN-38). */
export class WrongPasswordError extends DomainError {
	readonly code = "IDENTITY.WRONG_PASSWORD";
}

/** A Google-only account confirms with its email, and this is another (RN-38). */
export class EmailMismatchError extends DomainError {
	readonly code = "IDENTITY.EMAIL_MISMATCH";
}

/** Too many wrong passwords in a row (RN-23). */
export class TooManyAttemptsError extends DomainError {
	readonly code = "IDENTITY.TOO_MANY_ATTEMPTS";
}

/** Not this user's upload, or the file never reached storage (RN-07). */
export class InvalidProfilePhotoError extends DomainError {
	readonly code = "IDENTITY.INVALID_PHOTO";
}

/** No account with this id, or a deleted one (RN-27). */
export class CreatorProfileNotFoundError extends NotFoundError {
	readonly code = "IDENTITY.PROFILE_NOT_FOUND";
}
