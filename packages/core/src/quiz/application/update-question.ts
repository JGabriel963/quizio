import type { Clock } from "../../shared/application/ports/clock";
import { parseQuestionText } from "../domain/question";
import { QuestionNotFoundError } from "../domain/question-list";
import { loadEditableQuiz, markQuizEdited } from "./editable-quiz";
import type { QuestionRepository } from "./ports/question-repository";
import type { QuizRepository } from "./ports/quiz-repository";
import { type QuestionView, toQuestionView } from "./quiz-editor-view";
import type { QuizReference } from "./quiz-reference";

/** Partial on purpose: spec 004 adds time, points and choices here. */
export interface QuestionChanges {
	text?: string | null;
}

export interface UpdateQuestionInput extends QuizReference {
	questionId: string;
	changes: QuestionChanges;
}

/** Autosave of a question's fields (spec 003, RN-20). */
export type UpdateQuestion = (
	input: UpdateQuestionInput,
) => Promise<QuestionView>;

export function createUpdateQuestion(deps: {
	quizzes: QuizRepository;
	questions: QuestionRepository;
	clock: Clock;
}): UpdateQuestion {
	return async ({ questionId, changes, ...ref }) => {
		const { quiz, questions } = await loadEditableQuiz(deps, ref);
		const current = questions.find((question) => question.id === questionId);
		if (!current) {
			throw new QuestionNotFoundError("Question not found in this quiz");
		}
		const updated = {
			...current,
			...(changes.text !== undefined && {
				text: parseQuestionText(changes.text),
			}),
		};

		await deps.questions.saveQuestion(quiz.id, updated);
		await markQuizEdited(deps, quiz);

		return toQuestionView(updated);
	};
}
