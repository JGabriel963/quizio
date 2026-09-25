import type { IdGenerator } from "../../shared/application/ports/id-generator";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { blankQuestion } from "../domain/question";
import { assertQuizEditable, requireOwnedQuiz } from "../domain/quiz";
import type { QuestionRepository } from "./ports/question-repository";
import type { QuizRepository } from "./ports/quiz-repository";
import { toQuizDetailsView } from "./quiz-details-view";
import { type QuizEditorView, toQuestionView } from "./quiz-editor-view";
import type { QuizReference } from "./quiz-reference";

export type GetQuizEditor = (input: QuizReference) => Promise<QuizEditorView>;

export function createGetQuizEditor(deps: {
	quizzes: QuizRepository;
	questions: QuestionRepository;
	storage: Pick<ObjectStorage, "getPublicUrl">;
	ids: IdGenerator;
}): GetQuizEditor {
	return async ({ ownerId, quizId }) => {
		const quiz = requireOwnedQuiz(await deps.quizzes.findById(quizId), ownerId);
		// Trashed quizzes do not open in the editor (spec 003, RN-03).
		assertQuizEditable(quiz);

		let questions = await deps.questions.listByQuiz(quiz.id);
		if (questions.length === 0) {
			// Quizzes created before the editor get their first question on open
			// (RN-08). Opening is not an edit, so updatedAt stays (RN-24). saveList
			// replaces the whole list, so concurrent opens still leave one question.
			questions = [blankQuestion(deps.ids.generate())];
			await deps.questions.saveList(quiz.id, questions);
		}

		return {
			quiz: toQuizDetailsView(quiz, deps.storage, questions.length),
			questions: questions.map(toQuestionView),
		};
	};
}
