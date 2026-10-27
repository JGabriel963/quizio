import { NotFoundError } from "../../shared/domain/not-found-error";

/** No account with this id, or a deleted one (spec 039, RN-27). */
export class ProfileNotFoundError extends NotFoundError {
	readonly code = "LIBRARY.PROFILE_NOT_FOUND";
}

/** Not the owner's, made private, trashed or deleted (spec 039, RN-34). */
export class PublicQuizNotFoundError extends NotFoundError {
	readonly code = "LIBRARY.PUBLIC_QUIZ_NOT_FOUND";
}
