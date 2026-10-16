import { DomainError } from "../../shared/domain/domain-error";
import { GENERATION_MAX_QUESTIONS, type GenerationOptions } from "./generation";
import {
	type Choice,
	choiceIdAt,
	DEFAULT_CHOICE_COUNT,
	DEFAULT_TIME_LIMIT_SECONDS,
	MAX_CHOICE_COUNT,
	parseChoiceText,
	parseQuestionText,
	type Question,
	type QuestionContent,
} from "./question";
import { MIN_ANSWERS, questionIssues } from "./question-issues";

/**
 * A question as the model returns it, or as the browser sends a created one
 * back to be added (spec 027). Never trusted: it becomes a `Question` only
 * through the editor's rules.
 */
export type GeneratedDraft =
	| {
			type: "quiz";
			text: string;
			choices: { text: string; correct: boolean }[];
	  }
	| { type: "trueFalse"; text: string; correct: boolean };

export class InvalidGeneratedQuestionError extends DomainError {
	readonly code = "QUIZ.INVALID_GENERATED_QUESTION";
}

/** How many answers a created quiz question may have. */
type AnswerRange = { min: number; max: number };

/** Created from scratch: 4 answers, like a new question (RN-19). */
const GENERATED_ANSWERS: AnswerRange = {
	min: DEFAULT_CHOICE_COUNT,
	max: DEFAULT_CHOICE_COUNT,
};
/** Taken from a document, or sent back to be added: what the editor allows. */
const ANY_ANSWERS: AnswerRange = { min: MIN_ANSWERS, max: MAX_CHOICE_COUNT };

function invalid(reason: string): never {
	throw new InvalidGeneratedQuestionError(reason);
}

function quizContent(
	draft: Extract<GeneratedDraft, { type: "quiz" }>,
	answers: AnswerRange,
): QuestionContent {
	if (
		!Array.isArray(draft.choices) ||
		draft.choices.length < answers.min ||
		draft.choices.length > answers.max
	) {
		invalid(`A question needs ${answers.min} to ${answers.max} answers`);
	}
	const filled = draft.choices.map((choice) => {
		const text = parseChoiceText(choice.text);
		if (text === null) {
			invalid("An answer has no text");
		}
		return { text, correct: choice.correct === true };
	});
	const corrects = filled.filter((choice) => choice.correct).length;
	if (corrects === 0) {
		invalid("A question needs a correct answer");
	}
	const slots =
		filled.length <= DEFAULT_CHOICE_COUNT
			? DEFAULT_CHOICE_COUNT
			: MAX_CHOICE_COUNT;
	const choices: Choice[] = Array.from({ length: slots }, (_, index) => ({
		id: choiceIdAt(index),
		text: filled[index]?.text ?? null,
		correct: filled[index]?.correct ?? false,
	}));
	return {
		type: "quiz",
		selection: corrects > 1 ? "multiple" : "single",
		choices,
	};
}

function buildQuestion(
	draft: GeneratedDraft,
	id: string,
	answers: AnswerRange,
): Question {
	const text = parseQuestionText(draft.text);
	if (text === null) {
		invalid("A question has no text");
	}
	let content: QuestionContent;
	if (draft.type === "quiz") {
		content = quizContent(draft, answers);
	} else if (draft.type === "trueFalse" && typeof draft.correct === "boolean") {
		content = { type: "trueFalse", correct: draft.correct };
	} else {
		invalid("Unknown question type");
	}
	const question: Question = {
		id,
		text,
		timeLimitSeconds: DEFAULT_TIME_LIMIT_SECONDS,
		points: "standard",
		image: null,
		aiGenerated: true,
		...content,
	};
	if (questionIssues(question).length > 0) {
		invalid("A created question must be complete");
	}
	return question;
}

function fitsFormat(
	draft: GeneratedDraft,
	format: GenerationOptions["format"],
): boolean {
	switch (format) {
		case "quiz":
			return draft.type === "quiz";
		case "trueFalse":
			return draft.type === "trueFalse";
		default:
			return true;
	}
}

/**
 * Keeps what the model returned that fits the editor's rules and the request,
 * in order, and discards the rest: a question is never cut or completed
 * blindly (RN-19, RN-20). At most the requested count when generating, and
 * the technical maximum when extracting (RN-11, RN-22; CA-28).
 */
export function acceptGeneratedQuestions(
	drafts: readonly GeneratedDraft[],
	options: GenerationOptions,
	newId: () => string,
): { questions: Question[]; discarded: number } {
	const extracting = options.format === "extract";
	const answers = extracting ? ANY_ANSWERS : GENERATED_ANSWERS;
	const max = Math.min(
		extracting ? GENERATION_MAX_QUESTIONS : options.count,
		GENERATION_MAX_QUESTIONS,
	);
	const questions: Question[] = [];
	let discarded = 0;
	for (const draft of drafts) {
		if (questions.length === max) {
			break;
		}
		if (!fitsFormat(draft, options.format)) {
			discarded++;
			continue;
		}
		try {
			// Ids are only spent on the questions kept.
			const question = buildQuestion(draft, "", answers);
			questions.push({ ...question, id: newId() });
		} catch (error) {
			if (!(error instanceof DomainError)) {
				throw error;
			}
			discarded++;
		}
	}
	return { questions, discarded };
}

/**
 * A created question the browser sends back to be added (RN-26): checked again,
 * and refused rather than discarded, since only a tampered client sends an
 * invalid one.
 */
export function parseGeneratedQuestion(
	draft: GeneratedDraft,
	id: string,
): Question {
	return buildQuestion(draft, id, ANY_ANSWERS);
}
