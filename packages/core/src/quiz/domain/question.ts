import { DomainError } from "../../shared/domain/domain-error";
import { characterCount } from "../../shared/domain/text-length";
import { copyImage, type QuestionImage } from "./question-image";

/** The types the editor offers (spec 005, RN-01). */
export const QUESTION_TYPES = ["quiz", "trueFalse"] as const;
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

/** A little above Kahoot's 120 (spec 003, RN-10). */
export const QUESTION_TEXT_MAX_LENGTH = 160;
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

/** What every question type shares (ADR 0008). */
interface QuestionBase {
	id: string;
	/** Null means no text yet, which drafts allow (spec 003, RN-09). */
	text: string | null;
	timeLimitSeconds: TimeLimitSeconds;
	points: QuestionPoints;
	/** Optional, whatever the type (spec 007, RN-01). */
	image: QuestionImage | null;
}

export interface QuizQuestion extends QuestionBase {
	type: "quiz";
	selection: SelectionMode;
	/** 4 or 6 slots, in position order. */
	choices: Choice[];
}

/** Two fixed answers, "Verdadeiro" and "Falso" (spec 005, RN-06). */
export interface TrueFalseQuestion extends QuestionBase {
	type: "trueFalse";
	/** Which one is right; null until the creator marks it (RN-07). */
	correct: boolean | null;
}

/**
 * A question of a quiz. Its position is not an attribute: it is the index in
 * the quiz's ordered question list (spec 003).
 */
export type Question = QuizQuestion | TrueFalseQuestion;

/** The part of a question that belongs to its type (ADR 0008). */
export type QuizContent = Pick<QuizQuestion, "type" | "selection" | "choices">;
export type TrueFalseContent = Pick<TrueFalseQuestion, "type" | "correct">;
export type QuestionContent = QuizContent | TrueFalseContent;

export class InvalidQuestionTypeError extends DomainError {
	readonly code = "QUIZ.INVALID_TYPE";
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

/** What a question of the type starts with (spec 004, RN-02; spec 005, RN-07). */
export function blankContent(type: QuestionType): QuestionContent {
	switch (type) {
		case "quiz":
			return {
				type,
				selection: "single",
				choices: emptyChoices(DEFAULT_CHOICE_COUNT),
			};
		case "trueFalse":
			return { type, correct: null };
	}
}

/** A fresh question, a quiz one unless told otherwise (spec 003, RN-09; spec 005, RN-03). */
export function blankQuestion(id: string, type?: "quiz"): QuizQuestion;
export function blankQuestion(id: string, type: "trueFalse"): TrueFalseQuestion;
export function blankQuestion(id: string, type: QuestionType): Question;
export function blankQuestion(
	id: string,
	type: QuestionType = "quiz",
): Question {
	return {
		id,
		text: null,
		timeLimitSeconds: DEFAULT_TIME_LIMIT_SECONDS,
		points: "standard",
		image: null,
		...blankContent(type),
	};
}

/**
 * Nothing written, marked or inserted yet: the editor does not warn about a
 * question the creator has just started (spec 004, RN-16).
 */
export function isBlankQuestion(question: Question): boolean {
	if (question.text !== null || question.image !== null) {
		return false;
	}
	switch (question.type) {
		case "quiz":
			return question.choices.every((choice) => choice.text === null);
		case "trueFalse":
			return question.correct === null;
	}
}

/**
 * Marking one answer unmarks the other, and unmarking the marked one marks the
 * other: once answered, a true/false question always has a correct answer (RN-07).
 */
export function toggledTrueFalseCorrect(
	current: boolean | null,
	clicked: boolean,
): boolean {
	return current === clicked ? !clicked : clicked;
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

export function parseQuestionType(type: string): QuestionType {
	if (!isOneOf(QUESTION_TYPES, type)) {
		throw new InvalidQuestionTypeError(
			`Question type "${type}" is not supported`,
		);
	}
	return type;
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

function asRecord(raw: unknown): Record<string, unknown> {
	return typeof raw === "object" && raw !== null
		? (raw as Record<string, unknown>)
		: {};
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
export function parseQuizContent(raw: unknown): Omit<QuizContent, "type"> {
	const stored = asRecord(raw);
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

/** Reads the stored content of a question of `type`, as tolerantly as `parseQuizContent`. */
export function parseStoredContent(
	type: QuestionType,
	raw: unknown,
): QuestionContent {
	switch (type) {
		case "quiz":
			return { type, ...parseQuizContent(raw) };
		case "trueFalse": {
			const { correct } = asRecord(raw);
			return { type, correct: typeof correct === "boolean" ? correct : null };
		}
	}
}

/** The type-specific part of a question, detached from it. */
export function questionContent(question: Question): QuestionContent {
	switch (question.type) {
		case "quiz":
			return {
				type: question.type,
				selection: question.selection,
				choices: question.choices.map((choice) => ({ ...choice })),
			};
		case "trueFalse":
			return { type: question.type, correct: question.correct };
	}
}

/** What goes into the jsonb column: the content without its type, which is a column. */
export function storedContent(question: Question): Record<string, unknown> {
	const { type: _type, ...content } = questionContent(question);
	return content;
}

/** An independent copy under a new id (spec 003, RN-12; spec 004, RN-18; spec 005, RN-21). */
export function copyQuestion<T extends Question>(source: T, id: string): T {
	return {
		...source,
		...questionContent(source),
		image: copyImage(source.image),
		id,
	};
}
