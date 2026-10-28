import { DomainError } from "../../shared/domain/domain-error";
import { NotFoundError } from "../../shared/domain/not-found-error";
import { isBlankQuestion, type Question } from "./question";

/**
 * Rules of a quiz's ordered question list (spec 003). The list order is the
 * presentation order; a question's position is its index.
 */

/** Technical limit, the single source of the value (spec 003, RN-16). */
export const QUIZ_MAX_QUESTIONS = 200;

export class QuestionNotFoundError extends NotFoundError {
	readonly code = "QUIZ.QUESTION_NOT_FOUND";
}

export class QuestionLimitReachedError extends DomainError {
	readonly code = "QUIZ.QUESTION_LIMIT_REACHED";
}

export class LastQuestionError extends DomainError {
	readonly code = "QUIZ.LAST_QUESTION";
}

export class InvalidQuestionPositionError extends DomainError {
	readonly code = "QUIZ.INVALID_QUESTION_POSITION";
}

export class NoGeneratedQuestionsError extends DomainError {
	readonly code = "QUIZ.NO_GENERATED_QUESTIONS";
}

export type QuestionList = readonly Question[];

function indexOfQuestion(list: QuestionList, questionId: string): number {
	const index = list.findIndex((question) => question.id === questionId);
	if (index === -1) {
		throw new QuestionNotFoundError("Question not found in this quiz");
	}
	return index;
}

function assertRoomForOneMore(list: QuestionList): void {
	if (list.length >= QUIZ_MAX_QUESTIONS) {
		throw new QuestionLimitReachedError(
			`A quiz has at most ${QUIZ_MAX_QUESTIONS} questions`,
		);
	}
}

function insertAt(list: QuestionList, question: Question, index: number) {
	return [...list.slice(0, index), question, ...list.slice(index)];
}

/** Right after `afterId`, or at the end when null (RN-11, RN-12, RN-16). */
export function insertQuestionAfter(
	list: QuestionList,
	afterId: string | null,
	question: Question,
): { list: QuestionList; index: number } {
	const index =
		afterId === null ? list.length : indexOfQuestion(list, afterId) + 1;
	assertRoomForOneMore(list);
	return { list: insertAt(list, question, index), index };
}

/** RN-13. */
export function moveQuestion(
	list: QuestionList,
	questionId: string,
	toIndex: number,
): QuestionList {
	const from = indexOfQuestion(list, questionId);
	if (!Number.isInteger(toIndex) || toIndex < 0 || toIndex >= list.length) {
		throw new InvalidQuestionPositionError(
			`Position ${toIndex} is outside the question list`,
		);
	}
	const without = list.filter((_, index) => index !== from);
	return insertAt(without, list[from] as Question, toIndex);
}

/** RN-14, RN-15: a quiz never loses its last question. */
export function removeQuestion(
	list: QuestionList,
	questionId: string,
): QuestionList {
	const index = indexOfQuestion(list, questionId);
	if (list.length === 1) {
		throw new LastQuestionError("A quiz must keep at least one question");
	}
	return list.filter((_, position) => position !== index);
}

/**
 * Questions added in one go, in order, right after `afterId` or at the end
 * when null; the lone blank question a new quiz starts with is replaced
 * instead (spec 027, RN-26, RN-27; spec 044, RN-21).
 */
export function insertQuestionsAfter(
	list: QuestionList,
	afterId: string | null,
	added: QuestionList,
): { list: QuestionList; firstIndex: number } {
	if (added.length === 0) {
		throw new NoGeneratedQuestionsError("Choose at least one question to add");
	}
	const loneBlank = list.length === 1 && isBlankQuestion(list[0] as Question);
	const kept = loneBlank ? [] : list;
	if (kept.length + added.length > QUIZ_MAX_QUESTIONS) {
		throw new QuestionLimitReachedError(
			`A quiz has at most ${QUIZ_MAX_QUESTIONS} questions`,
		);
	}
	const index =
		loneBlank || afterId === null
			? kept.length
			: indexOfQuestion(kept, afterId) + 1;
	return {
		list: [...kept.slice(0, index), ...added, ...kept.slice(index)],
		firstIndex: index,
	};
}

/** The creation assistant's questions go to the end (spec 027, RN-26, RN-27). */
export function appendGeneratedQuestions(
	list: QuestionList,
	generated: QuestionList,
): { list: QuestionList; firstIndex: number } {
	return insertQuestionsAfter(list, null, generated);
}
