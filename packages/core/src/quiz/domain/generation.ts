import { DomainError } from "../../shared/domain/domain-error";
import { NotFoundError } from "../../shared/domain/not-found-error";
import { characterCount } from "../../shared/domain/text-length";

/**
 * What the creation assistant is asked for (spec 027). The lists are the single
 * source of the values: the API validates against them and the screens show them.
 */

/** Topic or PDF (spec 027, RN-04). */
export const GENERATION_SOURCE_KINDS = ["topic", "pdf"] as const;
export type GenerationSourceKind = (typeof GENERATION_SOURCE_KINDS)[number];

/** The question types the quiz has, both, or the PDF's own questions (RN-08). */
export const GENERATION_FORMATS = [
	"quiz",
	"trueFalse",
	"mixed",
	"extract",
] as const;
export type GenerationFormat = (typeof GENERATION_FORMATS)[number];

export const SKILL_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

/** `auto` keeps the document's language, and only goes with extract (RN-09). */
export const GENERATION_LANGUAGES = [
	"pt",
	"en",
	"es",
	"fr",
	"de",
	"it",
	"auto",
] as const;
export type GenerationLanguage = (typeof GENERATION_LANGUAGES)[number];

/** "About N questions" (RN-11). */
export const GENERATION_COUNTS = [5, 10, 20, 30] as const;
export type GenerationCount = (typeof GENERATION_COUNTS)[number];

/** Technical limits, configurable here (RN-05, RN-11, RN-14). */
export const GENERATION_TOPIC_MAX_LENGTH = 20_000;
export const GENERATION_MAX_PAGES = 50;
export const GENERATION_MAX_QUESTIONS = 30;
/** The quota counts the last 24 hours, a rolling window (RN-31). */
export const GENERATION_QUOTA_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface GenerationOptions {
	format: GenerationFormat;
	language: GenerationLanguage;
	level: SkillLevel;
	count: GenerationCount;
}

/** RN-08 to RN-11; CA-01. */
export const DEFAULT_GENERATION_OPTIONS: GenerationOptions = {
	format: "quiz",
	language: "pt",
	level: "intermediate",
	count: 20,
};

export interface GenerationOptionsInput {
	format: string;
	language: string;
	level: string;
	count: number;
}

export class InvalidGenerationOptionsError extends DomainError {
	readonly code = "QUIZ.INVALID_GENERATION_OPTIONS";
}

export class GenerationTopicEmptyError extends DomainError {
	readonly code = "QUIZ.GENERATION_TOPIC_EMPTY";
}

export class GenerationTopicTooLongError extends DomainError {
	readonly code = "QUIZ.GENERATION_TOPIC_TOO_LONG";
}

export class InvalidSourcePagesError extends DomainError {
	readonly code = "QUIZ.INVALID_SOURCE_PAGES";
}

/** A PDF protected by a password (RN-13). */
export class EncryptedSourceError extends DomainError {
	readonly code = "QUIZ.SOURCE_ENCRYPTED";
}

/** A file that cannot be read as a PDF (RN-13). */
export class InvalidSourceError extends DomainError {
	readonly code = "QUIZ.SOURCE_INVALID";
}

/** Missing, already discarded, or another creator's (RN-34). */
export class SourceNotFoundError extends NotFoundError {
	readonly code = "QUIZ.SOURCE_NOT_FOUND";
}

/** The instance has no AI provider (RN-01). */
export class GenerationUnavailableError extends DomainError {
	readonly code = "QUIZ.GENERATION_UNAVAILABLE";
}

/** No generation left in the last 24 hours (RN-31, RN-32). */
export class GenerationQuotaExceededError extends DomainError {
	readonly code = "QUIZ.GENERATION_QUOTA_EXCEEDED";
}

/** The provider failed, took too long or answered outside the format (RN-33). */
/** The instance's generations of the last 24 hours are used up (RN-31). */
export class GenerationInstanceLimitError extends DomainError {
	readonly code = "QUIZ.GENERATION_INSTANCE_LIMIT";
}

export class GenerationFailedError extends DomainError {
	readonly code = "QUIZ.GENERATION_FAILED";
}

function isOneOf<T extends string | number>(
	values: readonly T[],
	value: unknown,
): value is T {
	return (values as readonly unknown[]).includes(value);
}

/**
 * Checks the options against the lists and the source. Extracting keeps the
 * document's language and takes every question it has, so the language becomes
 * `auto` and level and count stop mattering (RN-09 to RN-11).
 */
export function parseGenerationOptions(
	input: GenerationOptionsInput,
	source: GenerationSourceKind,
): GenerationOptions {
	const { format, language, level, count } = input;
	if (
		!isOneOf(GENERATION_FORMATS, format) ||
		!isOneOf(GENERATION_LANGUAGES, language) ||
		!isOneOf(SKILL_LEVELS, level) ||
		!isOneOf(GENERATION_COUNTS, count)
	) {
		throw new InvalidGenerationOptionsError(
			"Generation options are outside the allowed values",
		);
	}
	if (format === "extract") {
		if (source !== "pdf") {
			throw new InvalidGenerationOptionsError(
				"Only a PDF has questions to extract",
			);
		}
		return {
			format,
			language: "auto",
			level: DEFAULT_GENERATION_OPTIONS.level,
			count: GENERATION_MAX_QUESTIONS,
		};
	}
	if (language === "auto") {
		throw new InvalidGenerationOptionsError(
			"Automatic language only goes with extract",
		);
	}
	return { format, language, level, count };
}

/**
 * Reads remembered options tolerantly (RN-07): anything unknown falls back to
 * the default, and extract and auto, which only fit a PDF, are not remembered.
 */
export function parseStoredGenerationOptions(raw: unknown): GenerationOptions {
	const stored =
		typeof raw === "object" && raw !== null
			? (raw as Record<string, unknown>)
			: {};
	const defaults = DEFAULT_GENERATION_OPTIONS;
	return {
		format:
			isOneOf(GENERATION_FORMATS, stored.format) && stored.format !== "extract"
				? stored.format
				: defaults.format,
		language:
			isOneOf(GENERATION_LANGUAGES, stored.language) &&
			stored.language !== "auto"
				? stored.language
				: defaults.language,
		level: isOneOf(SKILL_LEVELS, stored.level) ? stored.level : defaults.level,
		count: isOneOf(GENERATION_COUNTS, stored.count)
			? stored.count
			: defaults.count,
	};
}

/** A topic, a pasted text or instructions (RN-05). */
export function parseTopicText(raw: string): string {
	const text = raw.trim();
	if (text === "") {
		throw new GenerationTopicEmptyError("Write a topic to generate from");
	}
	if (characterCount(text) > GENERATION_TOPIC_MAX_LENGTH) {
		throw new GenerationTopicTooLongError(
			`A topic has at most ${GENERATION_TOPIC_MAX_LENGTH} characters`,
		);
	}
	return text;
}

/** 1-based page numbers, distinct, from 1 to the page limit (RN-14). */
export function parseSourcePages(pages: readonly number[]): number[] {
	const valid =
		pages.length >= 1 &&
		pages.length <= GENERATION_MAX_PAGES &&
		pages.every((page) => Number.isInteger(page) && page >= 1) &&
		new Set(pages).size === pages.length;
	if (!valid) {
		throw new InvalidSourcePagesError(
			`Choose from 1 to ${GENERATION_MAX_PAGES} distinct pages`,
		);
	}
	return [...pages];
}
