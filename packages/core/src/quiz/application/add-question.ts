import type { Clock } from "../../shared/application/ports/clock";
import type { IdGenerator } from "../../shared/application/ports/id-generator";
import { blankQuestion } from "../domain/question";
import { insertQuestionAfter } from "../domain/question-list";
import { loadEditableQuiz, markQuizEdited } from "./editable-quiz";
import type { QuestionRepository } from "./ports/question-repository";
import type { QuizRepository } from "./ports/quiz-repository";
import { type QuestionView, toQuestionView } from "./quiz-editor-view";
import type { QuizReference } from "./quiz-reference";

export interface AddQuestionInput extends QuizReference {
	/** The selected question; null adds at the end. */
	afterQuestionId: string | null;
}

export interface PlacedQuestion {
	question: QuestionView;
	index: number;
}

export type AddQuestion = (input: AddQuestionInput) => Promise<PlacedQuestion>;

export function createAddQuestion(deps: {
	quizzes: QuizRepository;
	questions: QuestionRepository;
	ids: IdGenerator;
	clock: Clock;
}): AddQuestion {
	return async ({ afterQuestionId, ...ref }) => {
		const { quiz, questions } = await loadEditableQuiz(deps, ref);
		const question = blankQuestion(deps.ids.generate());
		const { list, index } = insertQuestionAfter(
			questions,
			afterQuestionId,
			question,
		);

		await deps.questions.saveList(quiz.id, list);
		await markQuizEdited(deps, quiz);

		return { question: toQuestionView(question), index };
	};
}
