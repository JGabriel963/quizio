import type { Clock } from "../../shared/application/ports/clock";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { copyQuestion } from "../domain/question";
import { markQuizChanges, QuizNotPublishedError } from "../domain/quiz";
import { loadCurrentVersion, loadEditableQuiz } from "./editable-quiz";
import type { QuestionRepository } from "./ports/question-repository";
import type { QuizRepository } from "./ports/quiz-repository";
import type { QuizVersionRepository } from "./ports/quiz-version-repository";
import { releaseUnusedImages } from "./question-images";
import { type QuizEditorView, toQuizEditorView } from "./quiz-editor-view";
import type { QuizReference } from "./quiz-reference";

/**
 * "Descartar": the question list goes back to the playable version's. The
 * quiz details are not part of the version and stay (spec 006, RN-26).
 */
export type DiscardQuizChanges = (
	input: QuizReference,
) => Promise<QuizEditorView>;

export function createDiscardQuizChanges(deps: {
	quizzes: QuizRepository;
	questions: QuestionRepository;
	versions: Pick<QuizVersionRepository, "find" | "listByQuiz">;
	storage: Pick<ObjectStorage, "getPublicUrl" | "delete">;
	clock: Clock;
}): DiscardQuizChanges {
	return async (ref) => {
		const { quiz, questions: discarded } = await loadEditableQuiz(deps, ref);
		const version = await loadCurrentVersion(deps, quiz);
		if (!version) {
			throw new QuizNotPublishedError(
				"Only a published quiz has changes to discard",
			);
		}
		const questions = version.questions.map((question) =>
			copyQuestion(question, question.id),
		);

		await deps.questions.saveList(quiz.id, questions);
		const settled = markQuizChanges(quiz, false, deps.clock.now());
		await deps.quizzes.markEdited(settled.id, {
			updatedAt: settled.updatedAt,
			hasUnpublishedChanges: settled.hasUnpublishedChanges,
		});
		// Images only the discarded draft used go away (spec 007, RN-36).
		await releaseUnusedImages(deps, quiz.id, discarded, questions);

		return toQuizEditorView(settled, questions, version, deps.storage);
	};
}
