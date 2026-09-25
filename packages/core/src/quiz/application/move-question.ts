import type { Clock } from "../../shared/application/ports/clock";
import { moveQuestion } from "../domain/question-list";
import { loadEditableQuiz, markQuizEdited } from "./editable-quiz";
import type { QuestionRepository } from "./ports/question-repository";
import type { QuizRepository } from "./ports/quiz-repository";
import type { QuizReference } from "./quiz-reference";

export interface MoveQuestionInput extends QuizReference {
	questionId: string;
	toIndex: number;
}

export type MoveQuestion = (input: MoveQuestionInput) => Promise<void>;

export function createMoveQuestion(deps: {
	quizzes: QuizRepository;
	questions: QuestionRepository;
	clock: Clock;
}): MoveQuestion {
	return async ({ questionId, toIndex, ...ref }) => {
		const { quiz, questions } = await loadEditableQuiz(deps, ref);
		const list = moveQuestion(questions, questionId, toIndex);

		await deps.questions.saveList(quiz.id, list);
		await markQuizEdited(deps, quiz);
	};
}
