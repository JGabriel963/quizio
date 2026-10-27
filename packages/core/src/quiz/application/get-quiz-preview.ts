import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { requireOwnedQuiz } from "../domain/quiz";
import type { QuestionRepository } from "./ports/question-repository";
import type { QuizRepository } from "./ports/quiz-repository";
import { imageKeysOf } from "./question-images";
import { type QuestionView, toQuestionView } from "./quiz-editor-view";
import type { QuizReference } from "./quiz-reference";

/** "Perguntas (N)" on the quiz's page: the live questions, read only. */
export interface QuizPreviewView {
	/** In position order; may be empty (opening the page is not an edit). */
	questions: QuestionView[];
	/** Public URL of every question image, by key: questions carry keys only. */
	imageUrls: Record<string, string>;
}

export type GetQuizPreview = (input: QuizReference) => Promise<QuizPreviewView>;

export function createGetQuizPreview(deps: {
	quizzes: QuizRepository;
	questions: Pick<QuestionRepository, "listByQuiz">;
	storage: Pick<ObjectStorage, "getPublicUrl">;
}): GetQuizPreview {
	return async ({ ownerId, quizId }) => {
		// Unlike the editor, a trashed quiz still shows its questions.
		const quiz = requireOwnedQuiz(await deps.quizzes.findById(quizId), ownerId);
		const questions = await deps.questions.listByQuiz(quiz.id);
		return {
			questions: questions.map(toQuestionView),
			imageUrls: Object.fromEntries(
				imageKeysOf(questions).map((key) => [
					key,
					deps.storage.getPublicUrl(key),
				]),
			),
		};
	};
}
