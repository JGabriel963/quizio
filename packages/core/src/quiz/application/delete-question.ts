import type { Clock } from "../../shared/application/ports/clock";
import { removeQuestion } from "../domain/question-list";
import { loadEditableQuiz, markQuizEdited } from "./editable-quiz";
import type { QuestionRepository } from "./ports/question-repository";
import type { QuizRepository } from "./ports/quiz-repository";
import type { QuizReference } from "./quiz-reference";

export interface DeleteQuestionInput extends QuizReference {
	questionId: string;
}

/** Final: the editor asks for confirmation first and offers no undo (spec 003, RN-14). */
export type DeleteQuestion = (input: DeleteQuestionInput) => Promise<void>;

export function createDeleteQuestion(deps: {
	quizzes: QuizRepository;
	questions: QuestionRepository;
	clock: Clock;
}): DeleteQuestion {
	return async ({ questionId, ...ref }) => {
		const { quiz, questions } = await loadEditableQuiz(deps, ref);
		const list = removeQuestion(questions, questionId);

		await deps.questions.saveList(quiz.id, list);
		await markQuizEdited(deps, quiz);
	};
}
