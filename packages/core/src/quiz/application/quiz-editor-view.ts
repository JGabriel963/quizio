import { copyQuestion, type Question } from "../domain/question";
import type { QuizDetailsView } from "./quiz-details-view";

/** A question as the editor shows it; list order is the question's position. */
export type QuestionView = Question;

/** Everything the editor needs to open a quiz (spec 003). */
export interface QuizEditorView {
	quiz: QuizDetailsView;
	/** In position order; never empty. */
	questions: QuestionView[];
}

/** A detached copy, so callers never share the aggregate's arrays. */
export function toQuestionView(question: Question): QuestionView {
	return copyQuestion(question, question.id);
}
