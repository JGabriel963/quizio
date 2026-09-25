import type { Question, QuestionType } from "../domain/question";
import type { QuizDetailsView } from "./quiz-details-view";

/** A question as the editor shows it; list order is the question's position. */
export interface QuestionView {
	id: string;
	type: QuestionType;
	text: string | null;
}

/** Everything the editor needs to open a quiz (spec 003). */
export interface QuizEditorView {
	quiz: QuizDetailsView;
	/** In position order; never empty. */
	questions: QuestionView[];
}

export function toQuestionView(question: Question): QuestionView {
	return { id: question.id, type: question.type, text: question.text };
}
