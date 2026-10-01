import { DomainError } from "../../shared/domain/domain-error";
import type { Question, QuizQuestion } from "./question";

/** Why a question is incomplete (spec 004, RN-14; spec 005, RN-11). */
export type QuestionIssue =
	| "missingText"
	| "notEnoughAnswers"
	| "noCorrectAnswer"
	| "noCorrectTrueFalse";

export const MIN_ANSWERS = 2;

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
	if (question.type === "trueFalse") {
		if (question.correct === null) {
			issues.push("noCorrectTrueFalse");
		}
		return issues;
	}
	if (answeredCount(question) < MIN_ANSWERS) {
		issues.push("notEnoughAnswers");
	}
	if (!question.choices.some((choice) => choice.correct)) {
		issues.push("noCorrectAnswer");
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
