import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { copyQuestion, type Question } from "../domain/question";
import type { Quiz } from "../domain/quiz";
import type { QuizVersion } from "../domain/quiz-version";
import { imageKeysOf } from "./question-images";
import { type QuizDetailsView, toQuizDetailsView } from "./quiz-details-view";

/** A question as the editor shows it; list order is the question's position. */
export type QuestionView = Question;

/** Everything the editor needs to open a quiz (spec 003). */
export interface QuizEditorView {
	quiz: QuizDetailsView;
	/** In position order; never empty. */
	questions: QuestionView[];
	/**
	 * The playable version's questions, or null for a draft: the editor compares
	 * them with `questions` to tell unpublished changes (spec 006, RN-19, RN-22).
	 */
	publishedQuestions: QuestionView[] | null;
	/**
	 * Public URL of every image the live and the published questions use, by
	 * key: questions carry keys only (spec 007).
	 */
	imageUrls: Record<string, string>;
}

/** A detached copy, so callers never share the aggregate's arrays. */
export function toQuestionView(question: Question): QuestionView {
	return copyQuestion(question, question.id);
}

export function toQuizEditorView(
	quiz: Quiz,
	questions: readonly Question[],
	version: QuizVersion | null,
	storage: Pick<ObjectStorage, "getPublicUrl">,
): QuizEditorView {
	return {
		quiz: toQuizDetailsView(quiz, storage, questions.length),
		questions: questions.map(toQuestionView),
		publishedQuestions: version?.questions.map(toQuestionView) ?? null,
		imageUrls: Object.fromEntries(
			imageKeysOf([...questions, ...(version?.questions ?? [])]).map((key) => [
				key,
				storage.getPublicUrl(key),
			]),
		),
	};
}
