import type { Clock } from "../../shared/application/ports/clock";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { removeQuestion } from "../domain/question-list";
import { loadEditableQuiz, markQuizEdited } from "./editable-quiz";
import type { QuestionRepository } from "./ports/question-repository";
import type { QuizRepository } from "./ports/quiz-repository";
import type { QuizVersionRepository } from "./ports/quiz-version-repository";
import { releaseUnusedImages } from "./question-images";
import type { QuizReference } from "./quiz-reference";

export interface DeleteQuestionInput extends QuizReference {
	questionId: string;
}

/** Final: the editor asks for confirmation first and offers no undo (spec 003, RN-14). */
export type DeleteQuestion = (input: DeleteQuestionInput) => Promise<void>;

export function createDeleteQuestion(deps: {
	quizzes: QuizRepository;
	questions: QuestionRepository;
	versions: Pick<QuizVersionRepository, "find" | "listByQuiz">;
	storage: Pick<ObjectStorage, "delete">;
	clock: Clock;
}): DeleteQuestion {
	return async ({ questionId, ...ref }) => {
		const { quiz, questions } = await loadEditableQuiz(deps, ref);
		const list = removeQuestion(questions, questionId);

		await deps.questions.saveList(quiz.id, list);
		await markQuizEdited(deps, quiz, list);
		await releaseUnusedImages(deps, quiz.id, questions, list);
	};
}
