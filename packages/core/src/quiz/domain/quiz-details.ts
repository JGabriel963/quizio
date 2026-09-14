import { DomainError } from "../../shared/domain/domain-error";
import { normalizeSearchText } from "../../shared/domain/search-text";
import {
	characterCount,
	truncateCharacters,
} from "../../shared/domain/text-length";

export const QUIZ_TITLE_MAX_LENGTH = 95;
export const QUIZ_DESCRIPTION_MAX_LENGTH = 500;

/**
 * Shown for quizzes without a title. It is Portuguese on purpose: it becomes
 * stored data in duplicated titles and must match searches (spec 001, RN-19/20).
 */
export const UNTITLED_QUIZ_TITLE = "Quiz sem título";
const DUPLICATE_TITLE_SUFFIX = " (cópia)";

export const QUIZ_VISIBILITIES = ["private", "unlisted"] as const;
export type QuizVisibility = (typeof QUIZ_VISIBILITIES)[number];
export const DEFAULT_QUIZ_VISIBILITY: QuizVisibility = "private";

export interface QuizDetails {
	title: string | null;
	description: string | null;
	visibility: QuizVisibility;
}

export class QuizTitleTooLongError extends DomainError {
	readonly code = "QUIZ.TITLE_TOO_LONG";
}

export class QuizDescriptionTooLongError extends DomainError {
	readonly code = "QUIZ.DESCRIPTION_TOO_LONG";
}

export class InvalidQuizVisibilityError extends DomainError {
	readonly code = "QUIZ.INVALID_VISIBILITY";
}

export function parseQuizTitle(raw: string | null | undefined): string | null {
	const title = raw?.trim() ?? "";
	if (title === "") {
		return null;
	}
	if (characterCount(title) > QUIZ_TITLE_MAX_LENGTH) {
		throw new QuizTitleTooLongError(
			`Quiz title must have at most ${QUIZ_TITLE_MAX_LENGTH} characters`,
		);
	}
	return title;
}

export function parseQuizDescription(
	raw: string | null | undefined,
): string | null {
	const description = raw?.trim() ?? "";
	if (description === "") {
		return null;
	}
	if (characterCount(description) > QUIZ_DESCRIPTION_MAX_LENGTH) {
		throw new QuizDescriptionTooLongError(
			`Quiz description must have at most ${QUIZ_DESCRIPTION_MAX_LENGTH} characters`,
		);
	}
	return description;
}

export function assertQuizVisibility(value: string): QuizVisibility {
	if (!(QUIZ_VISIBILITIES as readonly string[]).includes(value)) {
		throw new InvalidQuizVisibilityError(
			`Quiz visibility "${value}" is not supported`,
		);
	}
	return value as QuizVisibility;
}

/** Validates raw details as a whole, applying the default visibility. */
export function parseQuizDetails(input: {
	title?: string | null;
	description?: string | null;
	visibility?: string;
}): QuizDetails {
	return {
		title: parseQuizTitle(input.title),
		description: parseQuizDescription(input.description),
		visibility: assertQuizVisibility(
			input.visibility ?? DEFAULT_QUIZ_VISIBILITY,
		),
	};
}

export function displayQuizTitle(title: string | null): string {
	return title ?? UNTITLED_QUIZ_TITLE;
}

export function duplicateQuizTitle(title: string | null): string {
	const base = displayQuizTitle(title);
	const maxBaseLength =
		QUIZ_TITLE_MAX_LENGTH - characterCount(DUPLICATE_TITLE_SUFFIX);
	const fittedBase =
		characterCount(base) > maxBaseLength
			? truncateCharacters(base, maxBaseLength).trimEnd()
			: base;
	return `${fittedBase}${DUPLICATE_TITLE_SUFFIX}`;
}

export function quizSearchText(title: string | null): string {
	return normalizeSearchText(displayQuizTitle(title));
}
