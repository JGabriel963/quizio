import type { Clock } from "../../shared/application/ports/clock";
import {
	applyQuestionChange,
	type QuestionChange,
	type QuestionChangeNotice,
} from "../domain/question-change";
import { QuestionNotFoundError } from "../domain/question-list";
import { loadEditableQuiz, markQuizEdited } from "./editable-quiz";
import type { QuestionRepository } from "./ports/question-repository";
import type { QuizRepository } from "./ports/quiz-repository";
import { type QuestionView, toQuestionView } from "./quiz-editor-view";
import type { QuizReference } from "./quiz-reference";

export interface UpdateQuestionInput extends QuizReference {
	questionId: string;
	change: QuestionChange;
}

export interface UpdateQuestionOutput {
	question: QuestionView;
	notice: QuestionChangeNotice | null;
}

/** Autosave of one question field (spec 003, RN-20; spec 004). */
export type UpdateQuestion = (
	input: UpdateQuestionInput,
) => Promise<UpdateQuestionOutput>;

export function createUpdateQuestion(deps: {
	quizzes: QuizRepository;
	questions: QuestionRepository;
	clock: Clock;
}): UpdateQuestion {
	return async ({ questionId, change, ...ref }) => {
		const { quiz, questions } = await loadEditableQuiz(deps, ref);
		const current = questions.find((question) => question.id === questionId);
		if (!current) {
			throw new QuestionNotFoundError("Question not found in this quiz");
		}
		const { question, notice } = applyQuestionChange(current, change);

		await deps.questions.saveQuestion(quiz.id, question);
		await markQuizEdited(deps, quiz);

		return { question: toQuestionView(question), notice };
	};
}
