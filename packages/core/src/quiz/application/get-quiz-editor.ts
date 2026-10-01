import type { IdGenerator } from "../../shared/application/ports/id-generator";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { blankQuestion } from "../domain/question";
import { assertQuizEditable, requireOwnedQuiz } from "../domain/quiz";
import { loadCurrentVersion } from "./editable-quiz";
import type { QuestionRepository } from "./ports/question-repository";
import type { QuizRepository } from "./ports/quiz-repository";
import type { QuizVersionRepository } from "./ports/quiz-version-repository";
import { type QuizEditorView, toQuizEditorView } from "./quiz-editor-view";
import type { QuizReference } from "./quiz-reference";

export type GetQuizEditor = (input: QuizReference) => Promise<QuizEditorView>;

export function createGetQuizEditor(deps: {
	quizzes: QuizRepository;
	questions: QuestionRepository;
	versions: Pick<QuizVersionRepository, "find">;
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

		return toQuizEditorView(
			quiz,
			questions,
			await loadCurrentVersion(deps, quiz),
			deps.storage,
		);
	};
}
