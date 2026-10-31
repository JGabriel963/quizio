import { DomainError } from "../../shared/domain/domain-error";
import {
	ANSWER_MARGINS,
	type AnswerMargin,
} from "../../shared/domain/slider-scale";
import {
	copyTextFormatting,
	NO_FORMATTING,
	normalizeTextFormatting,
	overlapsSubAndSuper,
	readTextFormatting,
	type TextFormatting,
	textFormattingIssue,
	trimFormattedText,
} from "../../shared/domain/text-formatting";
import {
	characterCount,
	truncateCharacters,
} from "../../shared/domain/text-length";
import {
	type AnswerImage,
	copyAnswerImage,
	readAnswerImage,
} from "./answer-image";
import { copyImage, type QuestionImage } from "./question-image";

/** The types the editor offers (spec 005, RN-01; specs 031 to 033, RN-01). */
export const QUESTION_TYPES = [
	"quiz",
	"trueFalse",
	"typeAnswer",
	"slider",
	"puzzle",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/** Time limit choices of the editor, in seconds (spec 004, RN-10). */
export const TIME_LIMITS_SECONDS = [
	5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240,
] as const;
export type TimeLimitSeconds = (typeof TIME_LIMITS_SECONDS)[number];
export const DEFAULT_TIME_LIMIT_SECONDS: TimeLimitSeconds = 20;

/**
 * A type answer takes 20 s to 4 min and starts with 30 s (spec 031, RN-06); a
 * puzzle, 20 s to 4 min starting with 1 min (spec 033, RN-10).
 */
const FROM_20_TIME_LIMITS = TIME_LIMITS_SECONDS.filter(
	(seconds) => seconds >= 20,
);

/** A slider takes 10 s to 4 min and starts with 20 s (spec 032, RN-13). */
const SLIDER_TIME_LIMITS = TIME_LIMITS_SECONDS.filter(
	(seconds) => seconds >= 10,
);

/** The time limits a question of the type may have. */
export function timeLimitsFor(type: QuestionType): readonly TimeLimitSeconds[] {
	switch (type) {
		case "quiz":
		case "trueFalse":
			return TIME_LIMITS_SECONDS;
		case "typeAnswer":
		case "puzzle":
			return FROM_20_TIME_LIMITS;
		case "slider":
			return SLIDER_TIME_LIMITS;
	}
}

/** What a new question of the type starts with. */
export function defaultTimeLimitFor(type: QuestionType): TimeLimitSeconds {
	switch (type) {
		case "quiz":
		case "trueFalse":
		case "slider":
			return DEFAULT_TIME_LIMIT_SECONDS;
		case "typeAnswer":
			return 30;
		case "puzzle":
			return 60;
	}
}

/**
 * The time the type takes closest to `seconds`: its shortest one when
 * `seconds` is below it (spec 031, RN-07).
 */
export function fitTimeLimit(
	type: QuestionType,
	seconds: TimeLimitSeconds,
): TimeLimitSeconds {
	const allowed = timeLimitsFor(type);
	return allowed.includes(seconds)
		? seconds
		: (allowed.find((limit) => limit >= seconds) ??
				allowed[allowed.length - 1] ??
				seconds);
}

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
/** Accepted answers of a type answer: 1 to 4, of up to 20 characters (spec 031, RN-03). */
export const TYPE_ANSWER_MAX_LENGTH = 20;
export const MAX_ACCEPTED_ANSWERS = 4;
/** What a slider's min, max or answer may be typed with (spec 032, RN-04). */
export const SLIDER_NUMBER_MAX_LENGTH = 10;
/** The unit under a slider's number (spec 032, RN-05). */
export const SLIDER_UNIT_MAX_LENGTH = 20;
/** A puzzle's slots, and how many must be filled (spec 033, RN-03, RN-07). */
export const PUZZLE_ITEM_COUNT = 4;
export const MIN_PUZZLE_ITEMS = 3;

/**
 * An answer slot. Its position is fixed (color and shape), so its id is the
 * position's: ids only need to be unique inside the question.
 */
export interface Choice {
	id: string;
	/** Null means an empty slot. */
	text: string | null;
	/** The text's marked stretches (spec 048); none for an empty slot. */
	textFormatting: TextFormatting;
	/** The answer as an image instead of text (spec 049): never both. */
	image: AnswerImage | null;
	correct: boolean;
}

/** What every question type shares (ADR 0008). */
interface QuestionBase {
	id: string;
	/** Null means no text yet, which drafts allow (spec 003, RN-09). */
	text: string | null;
	/** The text's marked stretches, beside it (spec 047, ADR 0025); none for a null text. */
	textFormatting: TextFormatting;
	timeLimitSeconds: TimeLimitSeconds;
	points: QuestionPoints;
	/** Optional, whatever the type (spec 007, RN-01). */
	image: QuestionImage | null;
	/**
	 * Added by the creation assistant (spec 027, RN-29). Kept through edits and
	 * copies; never part of what is played.
	 */
	aiGenerated: boolean;
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
 * The player types the answer (spec 031). The first accepted answer is the
 * main one and is always there; the others are extra (RN-03, RN-04). A null
 * is a field left empty.
 */
export interface TypeAnswerQuestion extends QuestionBase {
	type: "typeAnswer";
	acceptedAnswers: (string | null)[];
}

/**
 * The player picks a number on a scale (spec 032). The min and the max may be
 * empty while the creator types; the answer stays null until "Adicionar
 * resposta". Numbers have at most 2 decimals (RN-03, RN-04).
 */
export interface SliderQuestion extends QuestionBase {
	type: "slider";
	min: number | null;
	max: number | null;
	answer: number | null;
	unit: string | null;
	answerMargin: AnswerMargin;
}

/**
 * The player puts the answers in the right order (spec 033). Always 4 slots,
 * top to bottom: the right order is the filled ones in that order (RN-03,
 * RN-08). A slot has no id: its color and shape are the position's, and
 * moving one carries its text to another place (RN-04, RN-05).
 */
export interface PuzzleQuestion extends QuestionBase {
	type: "puzzle";
	/** Up to 75 characters each, as a quiz answer; null is an empty slot. */
	items: (string | null)[];
	/**
	 * Each slot's marked stretches, aligned with `items` (spec 048, RN-11):
	 * moving a slot moves both. None for an empty slot.
	 */
	itemFormatting: TextFormatting[];
	/** Each slot's image instead of its text (spec 049), aligned with `items`. */
	itemImages: (AnswerImage | null)[];
}

/**
 * A question of a quiz. Its position is not an attribute: it is the index in
 * the quiz's ordered question list (spec 003).
 */
export type Question =
	| QuizQuestion
	| TrueFalseQuestion
	| TypeAnswerQuestion
	| SliderQuestion
	| PuzzleQuestion;

/** The part of a question that belongs to its type (ADR 0008). */
export type QuizContent = Pick<QuizQuestion, "type" | "selection" | "choices">;
export type TrueFalseContent = Pick<TrueFalseQuestion, "type" | "correct">;
export type TypeAnswerContent = Pick<
	TypeAnswerQuestion,
	"type" | "acceptedAnswers"
>;
export type SliderContent = Pick<
	SliderQuestion,
	"type" | "min" | "max" | "answer" | "unit" | "answerMargin"
>;
export type PuzzleContent = Pick<
	PuzzleQuestion,
	"type" | "items" | "itemFormatting" | "itemImages"
>;
export type QuestionContent =
	| QuizContent
	| TrueFalseContent
	| TypeAnswerContent
	| SliderContent
	| PuzzleContent;

export class InvalidQuestionTypeError extends DomainError {
	readonly code = "QUIZ.INVALID_TYPE";
}

export class QuestionTextTooLongError extends DomainError {
	readonly code = "QUIZ.QUESTION_TEXT_TOO_LONG";
}

export class InvalidTextFormattingError extends DomainError {
	readonly code = "QUIZ.INVALID_TEXT_FORMATTING";
}

export class ChoiceTextTooLongError extends DomainError {
	readonly code = "QUIZ.CHOICE_TEXT_TOO_LONG";
}

export class AcceptedAnswerTooLongError extends DomainError {
	readonly code = "QUIZ.ACCEPTED_ANSWER_TOO_LONG";
}

export class InvalidSliderNumberError extends DomainError {
	readonly code = "QUIZ.INVALID_SLIDER_NUMBER";
}

export class SliderUnitTooLongError extends DomainError {
	readonly code = "QUIZ.SLIDER_UNIT_TOO_LONG";
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
		textFormatting: NO_FORMATTING,
		image: null,
		correct: false,
	}));
}

/** An answer with text or an image (spec 049, RN-02). */
export function isFilledChoice(choice: Choice): boolean {
	return choice.text !== null || choice.image !== null;
}

/** A puzzle slot with text or an image (spec 049, RN-02). */
export function isFilledSlot(
	question: Pick<PuzzleQuestion, "items" | "itemImages">,
	slot: number,
): boolean {
	return (
		(question.items[slot] ?? null) !== null ||
		(question.itemImages[slot] ?? null) !== null
	);
}

/** A puzzle's four slots with no formatting (spec 048). */
function blankItemFormatting(): TextFormatting[] {
	return Array.from({ length: PUZZLE_ITEM_COUNT }, () => NO_FORMATTING);
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
		case "typeAnswer":
			return { type, acceptedAnswers: [null] };
		case "slider":
			return {
				type,
				min: 0,
				max: 50,
				answer: null,
				unit: null,
				answerMargin: "medium",
			};
		case "puzzle":
			return {
				type,
				items: Array(PUZZLE_ITEM_COUNT).fill(null),
				itemFormatting: blankItemFormatting(),
				itemImages: Array(PUZZLE_ITEM_COUNT).fill(null),
			};
	}
}

/** A fresh question, a quiz one unless told otherwise (spec 003, RN-09; spec 005, RN-03). */
export function blankQuestion(id: string, type?: "quiz"): QuizQuestion;
export function blankQuestion(id: string, type: "trueFalse"): TrueFalseQuestion;
export function blankQuestion(
	id: string,
	type: "typeAnswer",
): TypeAnswerQuestion;
export function blankQuestion(id: string, type: "slider"): SliderQuestion;
export function blankQuestion(id: string, type: "puzzle"): PuzzleQuestion;
export function blankQuestion(id: string, type: QuestionType): Question;
export function blankQuestion(
	id: string,
	type: QuestionType = "quiz",
): Question {
	return {
		id,
		text: null,
		textFormatting: NO_FORMATTING,
		timeLimitSeconds: defaultTimeLimitFor(type),
		points: "standard",
		image: null,
		aiGenerated: false,
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
			return !question.choices.some(isFilledChoice);
		case "trueFalse":
			return question.correct === null;
		case "typeAnswer":
			return question.acceptedAnswers.every((answer) => answer === null);
		case "slider":
			return question.answer === null && question.unit === null;
		case "puzzle":
			return question.items.every((_, slot) => !isFilledSlot(question, slot));
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

/** A text and its marked stretches, as a statement or an answer keeps them. */
export interface FormattedTextValue {
	text: string | null;
	textFormatting: TextFormatting;
}

/**
 * A text and its formatting as the question keeps them (spec 047, RN-04,
 * RN-07, RN-08, RN-10; spec 048, RN-04, RN-05, RN-08): the formatting must fit
 * the text as sent, the spaces at the ends are cut with the stretches moved
 * along, a blank text keeps no formatting, the limit counts the text only,
 * and subscript never crosses superscript.
 */
function parseFormattedText(
	raw: string | null | undefined,
	formatting: unknown,
	max: number,
	tooLong: () => DomainError,
): FormattedTextValue {
	const sent = raw ?? "";
	if (textFormattingIssue(sent, formatting) !== null) {
		throw new InvalidTextFormattingError(
			"The formatting does not fit the text",
		);
	}
	const trimmed = trimFormattedText(sent, formatting as TextFormatting);
	if (trimmed.text === "") {
		return { text: null, textFormatting: NO_FORMATTING };
	}
	if (characterCount(trimmed.text) > max) {
		throw tooLong();
	}
	const textFormatting = normalizeTextFormatting(
		trimmed.text,
		trimmed.formatting,
	);
	if (overlapsSubAndSuper(textFormatting)) {
		throw new InvalidTextFormattingError(
			"Subscript and superscript cannot cover the same characters",
		);
	}
	return { text: trimmed.text, textFormatting };
}

/** The statement and its formatting (spec 003, RN-10; spec 047). */
export function parseQuestionStatement(
	raw: string | null | undefined,
	formatting: unknown,
): FormattedTextValue {
	return parseFormattedText(
		raw,
		formatting,
		QUESTION_TEXT_MAX_LENGTH,
		() =>
			new QuestionTextTooLongError(
				`Question text must have at most ${QUESTION_TEXT_MAX_LENGTH} characters`,
			),
	);
}

/** A quiz answer or a puzzle slot and its formatting (spec 004, RN-04; spec 048). */
export function parseAnswer(
	raw: string | null | undefined,
	formatting: unknown,
): FormattedTextValue {
	return parseFormattedText(
		raw,
		formatting,
		CHOICE_TEXT_MAX_LENGTH,
		() =>
			new ChoiceTextTooLongError(
				`Answer text must have at most ${CHOICE_TEXT_MAX_LENGTH} characters`,
			),
	);
}

/** Trims, turns blank text into null and enforces the limit (spec 003, RN-10). */
export function parseQuestionText(
	raw: string | null | undefined,
): string | null {
	return parseQuestionStatement(raw, NO_FORMATTING).text;
}

/** An answer's text alone, for who has no formatting (spec 004, RN-04). */
export function parseChoiceText(raw: string | null | undefined): string | null {
	return parseAnswer(raw, NO_FORMATTING).text;
}

/** Same rules for an accepted answer of a type answer (spec 031, RN-03). */
export function parseAcceptedAnswer(
	raw: string | null | undefined,
): string | null {
	return parseLimitedText(
		raw,
		TYPE_ANSWER_MAX_LENGTH,
		() =>
			new AcceptedAnswerTooLongError(
				`Accepted answers must have at most ${TYPE_ANSWER_MAX_LENGTH} characters`,
			),
	);
}

/** A sign, digits, then at most one separator and 2 decimals. */
const SLIDER_NUMBER = /^-?\d+(?:[.,]\d{1,2})?$/;

/**
 * A slider's min, max or answer as the creator typed it (spec 032, RN-04):
 * negative numbers, a comma or a dot, at most 2 decimals and 10 characters.
 * The typographic minus counts as "-".
 */
export function parseSliderNumber(raw: string): number {
	const text = raw.trim().replace("\u2212", "-");
	if (text.length > SLIDER_NUMBER_MAX_LENGTH || !SLIDER_NUMBER.test(text)) {
		throw new InvalidSliderNumberError(
			`"${raw}" is not a number with at most 2 decimals and ${SLIDER_NUMBER_MAX_LENGTH} characters`,
		);
	}
	return Number(text.replace(",", "."));
}

/** The unit of a slider, as other texts are parsed (spec 032, RN-05). */
export function parseSliderUnit(raw: string | null | undefined): string | null {
	return parseLimitedText(
		raw,
		SLIDER_UNIT_MAX_LENGTH,
		() =>
			new SliderUnitTooLongError(
				`A slider's unit must have at most ${SLIDER_UNIT_MAX_LENGTH} characters`,
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

/** A stored time the type does not take reads as the type's default. */
export function parseStoredTimeLimit(
	type: QuestionType,
	raw: unknown,
): TimeLimitSeconds {
	return isOneOf(timeLimitsFor(type), raw) ? raw : defaultTimeLimitFor(type);
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

function isStoredChoice(value: unknown): value is {
	text: string | null;
	textFormatting?: unknown;
	image?: unknown;
	correct: boolean;
} {
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
		choices: rawChoices.map((choice, index) => {
			// Answers stored before spec 049 have none; an image wins over a text.
			const image = readAnswerImage(choice.image);
			const text = image ? null : choice.text;
			return {
				id: choiceIdAt(index),
				text,
				// Answers stored before spec 048 have none (RN-17).
				textFormatting: readTextFormatting(text, choice.textFormatting),
				image,
				correct: choice.correct && (text !== null || image !== null),
			};
		}),
	};
}

/**
 * Reads stored accepted answers tolerantly: anything that is not text is an
 * empty field, long ones are cut, and there are 1 to 4 of them.
 */
function parseStoredAcceptedAnswers(raw: unknown): (string | null)[] {
	const { acceptedAnswers } = asRecord(raw);
	if (!Array.isArray(acceptedAnswers) || acceptedAnswers.length === 0) {
		return [null];
	}
	return acceptedAnswers
		.slice(0, MAX_ACCEPTED_ANSWERS)
		.map((answer) =>
			typeof answer === "string" && answer.trim() !== ""
				? truncateCharacters(answer.trim(), TYPE_ANSWER_MAX_LENGTH)
				: null,
		);
}

/** A stored number of a slider: finite, with at most 2 decimals; anything else is empty. */
function storedSliderNumber(raw: unknown): number | null {
	return typeof raw === "number" &&
		Number.isFinite(raw) &&
		Math.abs(raw * 100 - Math.round(raw * 100)) < 1e-6
		? raw
		: null;
}

/** Reads a stored slider tolerantly; no content at all is the blank one. */
function parseStoredSlider(raw: unknown): SliderContent {
	const blank: SliderContent = {
		type: "slider",
		min: 0,
		max: 50,
		answer: null,
		unit: null,
		answerMargin: "medium",
	};
	const stored = asRecord(raw);
	if (Object.keys(stored).length === 0) {
		return blank;
	}
	return {
		type: "slider",
		min: storedSliderNumber(stored.min),
		max: storedSliderNumber(stored.max),
		answer: storedSliderNumber(stored.answer),
		unit:
			typeof stored.unit === "string" && stored.unit.trim() !== ""
				? truncateCharacters(stored.unit.trim(), SLIDER_UNIT_MAX_LENGTH)
				: null,
		answerMargin: isOneOf(ANSWER_MARGINS, stored.answerMargin)
			? stored.answerMargin
			: blank.answerMargin,
	};
}

/**
 * Reads a stored puzzle tolerantly: 4 slots, anything that is not text is
 * empty, and each slot's formatting is read against its text (spec 048,
 * RN-17), so the two lists always line up.
 */
function parseStoredPuzzle(raw: unknown): Omit<PuzzleContent, "type"> {
	const { items, itemFormatting, itemImages } = asRecord(raw);
	const storedItems = Array.isArray(items) ? items : [];
	const storedFormatting = Array.isArray(itemFormatting) ? itemFormatting : [];
	const storedImages = Array.isArray(itemImages) ? itemImages : [];
	const slots = Array.from({ length: PUZZLE_ITEM_COUNT }, (_, index) => {
		const item: unknown = storedItems[index];
		// An image wins over a text (spec 049, RN-01).
		const image = readAnswerImage(storedImages[index]);
		const text =
			!image && typeof item === "string" && item.trim() !== ""
				? truncateCharacters(item.trim(), CHOICE_TEXT_MAX_LENGTH)
				: null;
		return {
			text,
			formatting: readTextFormatting(text, storedFormatting[index]),
			image,
		};
	});
	return {
		items: slots.map(({ text }) => text),
		itemFormatting: slots.map(({ formatting }) => formatting),
		itemImages: slots.map(({ image }) => image),
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
		case "typeAnswer":
			return { type, acceptedAnswers: parseStoredAcceptedAnswers(raw) };
		case "slider":
			return parseStoredSlider(raw);
		case "puzzle":
			return { type, ...parseStoredPuzzle(raw) };
	}
}

/** The type-specific part of a question, detached from it. */
export function questionContent(question: Question): QuestionContent {
	switch (question.type) {
		case "quiz":
			return {
				type: question.type,
				selection: question.selection,
				choices: question.choices.map((choice) => ({
					...choice,
					textFormatting: copyTextFormatting(choice.textFormatting),
					image: copyAnswerImage(choice.image),
				})),
			};
		case "trueFalse":
			return { type: question.type, correct: question.correct };
		case "typeAnswer":
			return {
				type: question.type,
				acceptedAnswers: [...question.acceptedAnswers],
			};
		case "slider":
			return {
				type: question.type,
				min: question.min,
				max: question.max,
				answer: question.answer,
				unit: question.unit,
				answerMargin: question.answerMargin,
			};
		case "puzzle":
			return {
				type: question.type,
				items: [...question.items],
				itemFormatting: question.itemFormatting.map(copyTextFormatting),
				itemImages: question.itemImages.map(copyAnswerImage),
			};
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
		textFormatting: copyTextFormatting(source.textFormatting),
		image: copyImage(source.image),
		id,
	};
}
