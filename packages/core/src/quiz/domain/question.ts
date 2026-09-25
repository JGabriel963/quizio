import { DomainError } from "../../shared/domain/domain-error";
import { characterCount } from "../../shared/domain/text-length";

/** "trueFalse" arrives with spec 005. */
export const QUESTION_TYPES = ["quiz"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/**
 * A question of a quiz. Its position is not an attribute: it is the index in
 * the quiz's ordered question list (spec 003).
 */
export interface Question {
	id: string;
	type: QuestionType;
	/** Null means no text yet, which drafts allow (spec 003, RN-09). */
	text: string | null;
}

export const QUESTION_TEXT_MAX_LENGTH = 120;

export class QuestionTextTooLongError extends DomainError {
	readonly code = "QUIZ.QUESTION_TEXT_TOO_LONG";
}

/** A fresh quiz question with no text (spec 003, RN-09). */
export function blankQuestion(id: string): Question {
	return { id, type: "quiz", text: null };
}

/** Trims, turns blank text into null and enforces the limit (spec 003, RN-10). */
export function parseQuestionText(
	raw: string | null | undefined,
): string | null {
	const text = raw?.trim() ?? "";
	if (text === "") {
		return null;
	}
	if (characterCount(text) > QUESTION_TEXT_MAX_LENGTH) {
		throw new QuestionTextTooLongError(
			`Question text must have at most ${QUESTION_TEXT_MAX_LENGTH} characters`,
		);
	}
	return text;
}

/** An independent copy under a new id (spec 003, RN-12). */
export function copyQuestion(source: Question, id: string): Question {
	return { ...source, id };
}
