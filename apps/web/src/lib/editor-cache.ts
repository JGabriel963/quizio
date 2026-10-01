import {
	moveQuestion,
	removeQuestion,
} from "@quizio/core/quiz/domain/question-list";
import type { QuizPublishState } from "@quizio/core/quiz/domain/quiz";
import { sameQuestionLists } from "@quizio/core/quiz/domain/quiz-version";

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
		...data,
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
	return withQuestions(data, removeQuestion(data.questions, questionId));
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

/**
 * What the status badge shows for the cached editor data: the server's mark
 * lags behind the optimistic list, so the editor compares the questions
 * itself (spec 006, RN-19, RN-22).
 */
export function publishStateOf(data: QuizEditorData): QuizPublishState {
	if (data.publishedQuestions === null) {
		return "draft";
	}
	return sameQuestionLists(data.questions, data.publishedQuestions)
		? "published"
		: "unpublishedChanges";
}

/** Remembers the public URL of an image just uploaded (spec 007): questions carry keys only. */
export function withImageUrl(
	data: QuizEditorData,
	key: string,
	url: string,
): QuizEditorData {
	return { ...data, imageUrls: { ...data.imageUrls, [key]: url } };
}

/** The URL to show a question's image with, or null without an image. */
export function imageUrlOf(
	data: Pick<QuizEditorData, "imageUrls">,
	question: Pick<QuestionData, "image">,
): string | null {
	return question.image ? (data.imageUrls[question.image.key] ?? null) : null;
}

/** The quiz as the server answered a publish: its questions are now the playable version. */
export function withQuizPublished(
	data: QuizEditorData,
	quiz: QuizEditorData["quiz"],
): QuizEditorData {
	return { ...data, quiz, publishedQuestions: data.questions };
}
