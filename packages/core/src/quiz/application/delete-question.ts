import type { Clock } from "../../shared/application/ports/clock";
import { removeQuestion } from "../domain/question-list";
import type { PlacedQuestion } from "./add-question";
import { loadEditableQuiz, markQuizEdited } from "./editable-quiz";
import type { QuestionRepository } from "./ports/question-repository";
import type { QuizRepository } from "./ports/quiz-repository";
import { toQuestionView } from "./quiz-editor-view";
import type { QuizReference } from "./quiz-reference";

export interface DeleteQuestionInput extends QuizReference {
	questionId: string;
}

/** Returns the removed question and where it was, which the undo sends back. */
export type DeleteQuestion = (
	input: DeleteQuestionInput,
) => Promise<PlacedQuestion>;

export function createDeleteQuestion(deps: {
	quizzes: QuizRepository;
	questions: QuestionRepository;
	clock: Clock;
}): DeleteQuestion {
	return async ({ questionId, ...ref }) => {
		const { quiz, questions } = await loadEditableQuiz(deps, ref);
		const { list, removed, index } = removeQuestion(questions, questionId);

		await deps.questions.saveList(quiz.id, list);
		await markQuizEdited(deps, quiz);

		return { question: toQuestionView(removed), index };
	};
}
