import { DomainError } from "../../shared/domain/domain-error";
import { characterCount } from "../../shared/domain/text-length";

/** "trueFalse" arrives with spec 005. */
export const QUESTION_TYPES = ["quiz"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/** Time limit choices of the editor, in seconds (spec 004, RN-10). */
export const TIME_LIMITS_SECONDS = [
	5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240,
] as const;
export type TimeLimitSeconds = (typeof TIME_LIMITS_SECONDS)[number];
export const DEFAULT_TIME_LIMIT_SECONDS: TimeLimitSeconds = 20;

/** Standard 1000, double 2000, none 0 (spec 004, RN-12). */
export const QUESTION_POINTS = ["standard", "double", "noPoints"] as const;
export type QuestionPoints = (typeof QUESTION_POINTS)[number];

/** Single or multiple choice (spec 004, RN-07). */
export const SELECTION_MODES = ["single", "multiple"] as const;
export type SelectionMode = (typeof SELECTION_MODES)[number];

export const QUESTION_TEXT_MAX_LENGTH = 120;
export const CHOICE_TEXT_MAX_LENGTH = 75;
/** Answer slots shown by default, and with the extra answers (spec 004, RN-02, RN-03). */
export const DEFAULT_CHOICE_COUNT = 4;
export const MAX_CHOICE_COUNT = 6;

/**
 * An answer slot. Its position is fixed (color and shape), so its id is the
 * position's: ids only need to be unique inside the question.
 */
export interface Choice {
	id: string;
	/** Null means an empty slot. */
	text: string | null;
	correct: boolean;
}

/**
 * A question of a quiz. Its position is not an attribute: it is the index in
 * the quiz's ordered question list (spec 003).
 */
export interface Question {
	id: string;
	type: QuestionType;
	/** Null means no text yet, which drafts allow (spec 003, RN-09). */
	text: string | null;
	timeLimitSeconds: TimeLimitSeconds;
	points: QuestionPoints;
	selection: SelectionMode;
	/** 4 or 6 slots, in position order. */
	choices: Choice[];
}

/** Type-specific part stored as jsonb (ADR 0008). */
export interface QuizContent {
	selection: SelectionMode;
	choices: Choice[];
}

export class QuestionTextTooLongError extends DomainError {
	readonly code = "QUIZ.QUESTION_TEXT_TOO_LONG";
}

export class ChoiceTextTooLongError extends DomainError {
	readonly code = "QUIZ.CHOICE_TEXT_TOO_LONG";
}

export class InvalidTimeLimitError extends DomainError {
	readonly code = "QUIZ.INVALID_TIME_LIMIT";
}

export class InvalidQuestionPointsError extends DomainError {
	readonly code = "QUIZ.INVALID_POINTS";
}

export class InvalidSelectionModeError extends DomainError {
	readonly code = "QUIZ.INVALID_SELECTION";
}

export function choiceIdAt(index: number): string {
	return `choice-${index + 1}`;
}

export function emptyChoices(count: number): Choice[] {
	return Array.from({ length: count }, (_, index) => ({
		id: choiceIdAt(index),
		text: null,
		correct: false,
	}));
}

/** A fresh quiz question (spec 003, RN-09; spec 004, RN-02). */
export function blankQuestion(id: string): Question {
	return {
		id,
		type: "quiz",
		text: null,
		timeLimitSeconds: DEFAULT_TIME_LIMIT_SECONDS,
		points: "standard",
		selection: "single",
		choices: emptyChoices(DEFAULT_CHOICE_COUNT),
	};
}

function parseLimitedText(
	raw: string | null | undefined,
	max: number,
	tooLong: () => DomainError,
): string | null {
	const text = raw?.trim() ?? "";
	if (text === "") {
		return null;
	}
	if (characterCount(text) > max) {
		throw tooLong();
	}
	return text;
}

/** Trims, turns blank text into null and enforces the limit (spec 003, RN-10). */
export function parseQuestionText(
	raw: string | null | undefined,
): string | null {
	return parseLimitedText(
		raw,
		QUESTION_TEXT_MAX_LENGTH,
		() =>
			new QuestionTextTooLongError(
				`Question text must have at most ${QUESTION_TEXT_MAX_LENGTH} characters`,
			),
	);
}

/** Same rules for an answer, with its own limit (spec 004, RN-04). */
export function parseChoiceText(raw: string | null | undefined): string | null {
	return parseLimitedText(
		raw,
		CHOICE_TEXT_MAX_LENGTH,
		() =>
			new ChoiceTextTooLongError(
				`Answer text must have at most ${CHOICE_TEXT_MAX_LENGTH} characters`,
			),
	);
}

function isOneOf<T extends string | number>(
	values: readonly T[],
	value: unknown,
): value is T {
	return (values as readonly unknown[]).includes(value);
}

export function parseTimeLimit(seconds: number): TimeLimitSeconds {
	if (!isOneOf(TIME_LIMITS_SECONDS, seconds)) {
		throw new InvalidTimeLimitError(
			`${seconds} s is not an allowed time limit`,
		);
	}
	return seconds;
}

export function parsePoints(points: string): QuestionPoints {
	if (!isOneOf(QUESTION_POINTS, points)) {
		throw new InvalidQuestionPointsError(
			`Points "${points}" are not supported`,
		);
	}
	return points;
}

export function parseSelection(selection: string): SelectionMode {
	if (!isOneOf(SELECTION_MODES, selection)) {
		throw new InvalidSelectionModeError(
			`Selection mode "${selection}" is not supported`,
		);
	}
	return selection;
}

function isStoredChoice(
	value: unknown,
): value is { text: string | null; correct: boolean } {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const { text, correct } = value as Record<string, unknown>;
	return (
		(text === null || typeof text === "string") && typeof correct === "boolean"
	);
}

/**
 * Reads stored quiz content tolerantly: anything missing or malformed falls
 * back to the blank question's content, so a bad row never breaks the editor.
 */
export function parseQuizContent(raw: unknown): QuizContent {
	const stored =
		typeof raw === "object" && raw !== null
			? (raw as Record<string, unknown>)
			: {};
	const selection = isOneOf(SELECTION_MODES, stored.selection)
		? stored.selection
		: "single";
	const rawChoices = stored.choices;
	const validChoices =
		Array.isArray(rawChoices) &&
		(rawChoices.length === DEFAULT_CHOICE_COUNT ||
			rawChoices.length === MAX_CHOICE_COUNT) &&
		rawChoices.every(isStoredChoice);

	if (!validChoices) {
		return { selection, choices: emptyChoices(DEFAULT_CHOICE_COUNT) };
	}
	return {
		selection,
		choices: rawChoices.map((choice, index) => ({
			id: choiceIdAt(index),
			text: choice.text,
			correct: choice.correct && choice.text !== null,
		})),
	};
}

/** An independent copy under a new id (spec 003, RN-12; spec 004, RN-18). */
export function copyQuestion(source: Question, id: string): Question {
	return {
		...source,
		id,
		choices: source.choices.map((choice) => ({ ...choice })),
	};
}
