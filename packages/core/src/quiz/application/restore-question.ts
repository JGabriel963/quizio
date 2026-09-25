import type { Clock } from "../../shared/application/ports/clock";
import { parseQuestionText, type QuestionType } from "../domain/question";
import { restoreQuestionAt } from "../domain/question-list";
import { loadEditableQuiz, markQuizEdited } from "./editable-quiz";
import type { QuestionRepository } from "./ports/question-repository";
import type { QuizRepository } from "./ports/quiz-repository";
import type { QuizReference } from "./quiz-reference";

export interface RestoreQuestionInput extends QuizReference {
	/** What `deleteQuestion` returned; revalidated like any edit. */
	question: { id: string; type: QuestionType; text: string | null };
	index: number;
}

/**
 * "Desfazer" of a question deletion (spec 003, RN-14). The client sends the
 * deleted content back, so no soft delete is needed.
 */
export type RestoreQuestion = (
	input: RestoreQuestionInput,
) => Promise<{ index: number }>;

export function createRestoreQuestion(deps: {
	quizzes: QuizRepository;
	questions: QuestionRepository;
	clock: Clock;
}): RestoreQuestion {
	return async ({ question, index, ...ref }) => {
		const { quiz, questions } = await loadEditableQuiz(deps, ref);
		const restored = {
			id: question.id,
			type: question.type,
			text: parseQuestionText(question.text),
		};
		const result = restoreQuestionAt(questions, restored, index);
		if (result.list === questions) {
			// Already back: a repeated undo changes nothing.
			return { index: result.index };
		}

		await deps.questions.saveList(quiz.id, result.list);
		await markQuizEdited(deps, quiz);

		return { index: result.index };
	};
}
