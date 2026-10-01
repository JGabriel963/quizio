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

/**
 * Not persisted: the editor flags incomplete questions, and publishing
 * (spec 006) will refuse them.
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
