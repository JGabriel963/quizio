import {
	moveQuestion,
	removeQuestion,
} from "@quizio/core/quiz/domain/question-list";

import type { QuestionData, QuizEditorData } from "./api-types";

/**
 * Pure updates of the cached editor data, reusing the core's list rules for
 * optimistic moves and removals. Each returns new data, so the previous value
 * is the rollback.
 */

function withQuestions(
	data: QuizEditorData,
	questions: readonly QuestionData[],
): QuizEditorData {
	return {
		quiz: { ...data.quiz, questionCount: questions.length },
		questions: [...questions],
	};
}

export function withQuestionMoved(
	data: QuizEditorData,
	questionId: string,
	toIndex: number,
): QuizEditorData {
	return withQuestions(data, moveQuestion(data.questions, questionId, toIndex));
}

export function withQuestionRemoved(
	data: QuizEditorData,
	questionId: string,
): QuizEditorData {
	return withQuestions(data, removeQuestion(data.questions, questionId).list);
}

export function withQuestionInserted(
	data: QuizEditorData,
	question: QuestionData,
	index: number,
): QuizEditorData {
	if (data.questions.some(({ id }) => id === question.id)) {
		return data;
	}
	const questions = [...data.questions];
	questions.splice(index, 0, question);
	return withQuestions(data, questions);
}

export function withQuestionChanged(
	data: QuizEditorData,
	question: QuestionData,
): QuizEditorData {
	return {
		...data,
		questions: data.questions.map((item) =>
			item.id === question.id ? question : item,
		),
	};
}

/** "Aplicar a todas as perguntas" before the server confirms (spec 004, RN-11). */
export function withTimeLimitForAll(
	data: QuizEditorData,
	seconds: QuestionData["timeLimitSeconds"],
): QuizEditorData {
	return {
		...data,
		questions: data.questions.map((question) => ({
			...question,
			timeLimitSeconds: seconds,
		})),
	};
}

/**
 * After a removal, the question that took its place is selected, or the
 * previous one when the last was removed (spec 003, RN-14).
 */
export function selectionAfterRemoval(
	remaining: readonly QuestionData[],
	removedIndex: number,
): string | undefined {
	return remaining[Math.min(removedIndex, remaining.length - 1)]?.id;
}
