import { DomainError } from "../../shared/domain/domain-error";
import type { SliderScale } from "../../shared/domain/slider-scale";
import { normalizeTypedAnswer } from "../../shared/domain/typed-answer";
import {
	MIN_PUZZLE_ITEMS,
	type Question,
	type QuizQuestion,
	type SliderQuestion,
} from "./question";

/**
 * Why a question is incomplete (spec 004, RN-14; spec 005, RN-11; spec 031,
 * RN-09; spec 032, RN-16; spec 033, RN-07).
 */
export type QuestionIssue =
	| "missingText"
	| "notEnoughAnswers"
	| "noCorrectAnswer"
	| "noCorrectTrueFalse"
	| "noAcceptedAnswer"
	| "noSliderAnswer"
	| "invalidSliderRange"
	| "sliderAnswerOutOfRange"
	| "notEnoughPuzzleItems";

export const MIN_ANSWERS = 2;

/** What keeps a slider from having a scale (spec 032, RN-16). */
function sliderIssue(question: SliderQuestion): QuestionIssue | null {
	const { min, max, answer } = question;
	if (min === null || max === null || min >= max) {
		return "invalidSliderRange";
	}
	if (answer === null) {
		return "noSliderAnswer";
	}
	return answer < min || answer > max ? "sliderAnswerOutOfRange" : null;
}

/** The scale of a slider with nothing missing; null otherwise (spec 032). */
export function sliderScaleOf(question: SliderQuestion): SliderScale | null {
	const { min, max, answer } = question;
	return sliderIssue(question) === null &&
		min !== null &&
		max !== null &&
		answer !== null
		? { min, max, answer, margin: question.answerMargin }
		: null;
}

function answeredCount(question: QuizQuestion): number {
	return question.choices.filter((choice) => choice.text !== null).length;
}

/** Publishing refuses a quiz with incomplete questions (spec 006, RN-09). */
export class IncompleteQuestionsError extends DomainError {
	readonly code = "QUIZ.INCOMPLETE_QUESTIONS";
}

/**
 * Not persisted: the editor flags incomplete questions, and publishing
 * (spec 006) refuses them.
 */
export function questionIssues(question: Question): QuestionIssue[] {
	const issues: QuestionIssue[] = [];
	if (question.text === null) {
		issues.push("missingText");
	}
	switch (question.type) {
		case "quiz":
			if (answeredCount(question) < MIN_ANSWERS) {
				issues.push("notEnoughAnswers");
			}
			if (!question.choices.some((choice) => choice.correct)) {
				issues.push("noCorrectAnswer");
			}
			break;
		case "trueFalse":
			if (question.correct === null) {
				issues.push("noCorrectTrueFalse");
			}
			break;
		case "typeAnswer":
			// An answer of signs only would match nothing anybody types (RN-09).
			if (
				!question.acceptedAnswers.some(
					(answer) => answer !== null && normalizeTypedAnswer(answer) !== "",
				)
			) {
				issues.push("noAcceptedAnswer");
			}
			break;
		case "slider": {
			const issue = sliderIssue(question);
			if (issue !== null) {
				issues.push(issue);
			}
			break;
		}
		case "puzzle":
			// Empty slots between filled ones do not count (spec 033, RN-07, RN-08).
			if (
				question.items.filter((item) => item !== null).length < MIN_PUZZLE_ITEMS
			) {
				issues.push("notEnoughPuzzleItems");
			}
			break;
	}
	return issues;
}

/** Positions (1 and 2) of a quiz question that get "A resposta N não foi adicionada" (RN-16). */
export function missingAnswerHints(question: Question): number[] {
	if (question.type !== "quiz" || answeredCount(question) >= MIN_ANSWERS) {
		return [];
	}
	return question.choices
		.slice(0, MIN_ANSWERS)
		.flatMap((choice, index) => (choice.text === null ? [index + 1] : []));
}

/** How many answers a quiz question still needs to reach the minimum (spec 006, RN-10a). */
export function missingAnswerCount(question: Question): number {
	return question.type === "quiz"
		? Math.max(0, MIN_ANSWERS - answeredCount(question))
		: 0;
}

export interface IncompleteQuestion {
	question: Question;
	/** 1-based, as the editor numbers the list. */
	position: number;
	issues: QuestionIssue[];
}

/** The questions that block publishing, in list order (spec 006, RN-09, RN-10). */
export function incompleteQuestions(
	list: readonly Question[],
): IncompleteQuestion[] {
	return list.flatMap((question, index) => {
		const issues = questionIssues(question);
		return issues.length > 0 ? [{ question, position: index + 1, issues }] : [];
	});
}
