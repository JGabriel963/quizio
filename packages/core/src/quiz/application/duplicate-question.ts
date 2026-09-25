import type { Clock } from "../../shared/application/ports/clock";
import type { IdGenerator } from "../../shared/application/ports/id-generator";
import { copyQuestion } from "../domain/question";
import {
	insertQuestionAfter,
	QuestionNotFoundError,
} from "../domain/question-list";
import type { PlacedQuestion } from "./add-question";
import { loadEditableQuiz, markQuizEdited } from "./editable-quiz";
import type { QuestionRepository } from "./ports/question-repository";
import type { QuizRepository } from "./ports/quiz-repository";
import { toQuestionView } from "./quiz-editor-view";
import type { QuizReference } from "./quiz-reference";

export interface DuplicateQuestionInput extends QuizReference {
	questionId: string;
}

export type DuplicateQuestion = (
	input: DuplicateQuestionInput,
) => Promise<PlacedQuestion>;

export function createDuplicateQuestion(deps: {
	quizzes: QuizRepository;
	questions: QuestionRepository;
	ids: IdGenerator;
	clock: Clock;
}): DuplicateQuestion {
	return async ({ questionId, ...ref }) => {
		const { quiz, questions } = await loadEditableQuiz(deps, ref);
		const source = questions.find((question) => question.id === questionId);
		if (!source) {
			throw new QuestionNotFoundError("Question not found in this quiz");
		}
		const copy = copyQuestion(source, deps.ids.generate());
		const { list, index } = insertQuestionAfter(questions, source.id, copy);

		await deps.questions.saveList(quiz.id, list);
		await markQuizEdited(deps, quiz);

		return { question: toQuestionView(copy), index };
	};
}
