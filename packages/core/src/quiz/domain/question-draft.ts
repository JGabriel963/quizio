import { DomainError } from "../../shared/domain/domain-error";
import {
	NO_FORMATTING,
	type TextFormatting,
} from "../../shared/domain/text-formatting";
import {
	DEFAULT_CHOICE_COUNT,
	defaultTimeLimitFor,
	MAX_CHOICE_COUNT,
	PUZZLE_ITEM_COUNT,
	parsePoints,
	parseQuestionStatement,
	parseQuestionType,
	parseSliderNumber,
	parseTimeLimit,
	type Question,
	type QuestionContent,
	type QuestionType,
	type TimeLimitSeconds,
	timeLimitsFor,
} from "./question";
import {
	InvalidChoiceCountError,
	parseQuestionContent,
	type QuestionContentInput,
	sliderRangeAround,
	TimeLimitNotAllowedError,
} from "./question-change";
import {
	type ImageCropInput,
	InvalidQuestionImageError,
	parseImageAltText,
	parseImageCrop,
	parseImagePlacement,
	type QuestionImage,
} from "./question-image";

/** A slider's number as an agent sends it: a number, or typed as the editor takes it. */
type SliderNumberInput = number | string | null;

/**
 * A whole question as an AI agent sends it (spec 044, RN-21), of any type the
 * editor offers. Never trusted: it becomes a `Question` only through the
 * editor's own rules. Fields of other types are ignored.
 */
export interface QuestionDraft {
	type: string;
	text?: string | null;
	/** The text's marked stretches (spec 047, RN-29); none when missing. */
	textFormatting?: TextFormatting;
	/** The type's default when missing. */
	timeLimitSeconds?: number;
	points?: string;
	image?: {
		/** An upload of the quiz owner; the use case checks it. */
		key: string;
		placement?: string;
		crop?: ImageCropInput | null;
		altText?: string | null;
	} | null;
	/** Quiz: 0 to 6 answers, put in 4 slots, or 6 when there are more than 4. */
	choices?: { text: string | null; correct: boolean }[];
	/** Quiz: multiple when more than one answer is correct, when missing. */
	selection?: string;
	/** True/false: which one is right, or null while unmarked. */
	correct?: boolean | null;
	/** Type answer: 1 to 4; the first is the main one. */
	acceptedAnswers?: (string | null)[];
	/** Slider: an answer alone brings the editor's range around it. */
	slider?: {
		min?: SliderNumberInput;
		max?: SliderNumberInput;
		answer?: SliderNumberInput;
		unit?: string | null;
		answerMargin?: string;
	};
	/** Puzzle: up to 4 texts, top to bottom in the right order. */
	items?: (string | null)[];
}

export class TooManyPuzzleItemsError extends DomainError {
	readonly code = "QUIZ.TOO_MANY_PUZZLE_ITEMS";
	constructor() {
		super(`A puzzle has at most ${PUZZLE_ITEM_COUNT} answers`);
	}
}

function draftTimeLimit(
	type: QuestionType,
	seconds: number | undefined,
): TimeLimitSeconds {
	if (seconds === undefined) {
		return defaultTimeLimitFor(type);
	}
	const allowed = timeLimitsFor(type);
	const limit = parseTimeLimit(seconds);
	if (!allowed.includes(limit)) {
		throw new TimeLimitNotAllowedError(
			`A ${type} question takes ${allowed.join(", ")} seconds`,
		);
	}
	return limit;
}

function sliderNumber(raw: SliderNumberInput | undefined): number | null {
	if (raw === undefined || raw === null) {
		return null;
	}
	return parseSliderNumber(String(raw));
}

function quizInput(draft: QuestionDraft): QuestionContentInput {
	const given = draft.choices ?? [];
	if (given.length > MAX_CHOICE_COUNT) {
		throw new InvalidChoiceCountError(
			`A question has at most ${MAX_CHOICE_COUNT} answers`,
		);
	}
	const slots =
		given.length <= DEFAULT_CHOICE_COUNT
			? DEFAULT_CHOICE_COUNT
			: MAX_CHOICE_COUNT;
	const choices = Array.from(
		{ length: slots },
		(_, index) => given[index] ?? { text: null, correct: false },
	);
	const corrects = choices.filter((choice) => choice.correct).length;
	return {
		type: "quiz",
		selection: draft.selection ?? (corrects > 1 ? "multiple" : "single"),
		choices,
	};
}

function sliderInput(draft: QuestionDraft): QuestionContentInput {
	const slider = draft.slider ?? {};
	const answer = sliderNumber(slider.answer);
	const noRange = slider.min === undefined && slider.max === undefined;
	// An answer alone brings its range, as the first answer typed in the editor
	// does (spec 032, RN-06); no answer at all is the blank slider's range.
	const range =
		noRange && answer !== null
			? sliderRangeAround(answer)
			: noRange
				? { min: 0, max: 50 }
				: { min: sliderNumber(slider.min), max: sliderNumber(slider.max) };
	return {
		type: "slider",
		...range,
		answer,
		unit: slider.unit ?? null,
		answerMargin: slider.answerMargin ?? "medium",
	};
}

function contentInput(
	type: QuestionType,
	draft: QuestionDraft,
): QuestionContentInput {
	switch (type) {
		case "quiz":
			return quizInput(draft);
		case "trueFalse":
			return { type, correct: draft.correct ?? null };
		case "typeAnswer": {
			const answers = draft.acceptedAnswers ?? [];
			return { type, acceptedAnswers: answers.length > 0 ? answers : [null] };
		}
		case "slider":
			return sliderInput(draft);
		case "puzzle": {
			const items = draft.items ?? [];
			if (items.length > PUZZLE_ITEM_COUNT) {
				throw new TooManyPuzzleItemsError();
			}
			return { type, items };
		}
	}
}

function draftImage(image: QuestionDraft["image"]): QuestionImage | null {
	if (!image) {
		return null;
	}
	if (typeof image.key !== "string" || image.key === "") {
		throw new InvalidQuestionImageError("An image needs its upload key");
	}
	return {
		key: image.key,
		placement: parseImagePlacement(image.placement ?? "media"),
		crop: image.crop ? parseImageCrop(image.crop) : null,
		altText: parseImageAltText(image.altText),
	};
}

/**
 * Builds a question from a draft with the editor's rules: limits refuse, what
 * is missing does not (an incomplete question is kept and flagged by
 * `questionIssues`, spec 044, RN-21).
 */
export function buildQuestion(
	draft: QuestionDraft,
	id: string,
	aiGenerated: boolean,
): Question {
	const type = parseQuestionType(draft.type);
	const content: QuestionContent = parseQuestionContent(
		contentInput(type, draft),
	);
	return {
		id,
		...parseQuestionStatement(
			draft.text,
			draft.textFormatting ?? NO_FORMATTING,
		),
		timeLimitSeconds: draftTimeLimit(type, draft.timeLimitSeconds),
		points: parsePoints(draft.points ?? "standard"),
		image: draftImage(draft.image),
		aiGenerated,
		...content,
	} as Question;
}

/** Every question an agent adds is made with AI (spec 044, RN-22). */
export function questionFromDraft(draft: QuestionDraft, id: string): Question {
	return buildQuestion(draft, id, true);
}
