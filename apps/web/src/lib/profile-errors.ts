import { domainCodeOf } from "./quiz-error-messages";

/** No account with this id, or a deleted one (spec 039, RN-27). */
export function isProfileNotFound(error: unknown): boolean {
	return domainCodeOf(error) === "LIBRARY.PROFILE_NOT_FOUND";
}

/** Not public anymore: made private, trashed or deleted (spec 039, RN-34). */
export function isPublicQuizNotFound(error: unknown): boolean {
	return domainCodeOf(error) === "LIBRARY.PUBLIC_QUIZ_NOT_FOUND";
}
