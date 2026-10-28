import type { Clock } from "../../shared/application/ports/clock";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { QuestionNotFoundError } from "../domain/question-list";
import { patchedQuestion, type QuestionPatch } from "../domain/question-patch";
import { loadEditableQuiz, markQuizEdited } from "./editable-quiz";
import type { QuestionRepository } from "./ports/question-repository";
import type { QuizRepository } from "./ports/quiz-repository";
import type { QuizVersionRepository } from "./ports/quiz-version-repository";
import { assertUsableImage, releaseUnusedImages } from "./question-images";
import { type QuestionView, toQuestionView } from "./quiz-editor-view";
import type { QuizReference } from "./quiz-reference";

export interface EditQuestionInput extends QuizReference {
	questionId: string;
	patch: QuestionPatch;
}

export type EditQuestion = (
	input: EditQuestionInput,
) => Promise<{ question: QuestionView }>;

/**
 * An AI agent changes a whole question at once (spec 044, RN-21). It reads the
 * question as it is now and writes the row, as the editor's autosave does, so
 * an edit of another field made meanwhile stays (RN-34).
 */
export function createEditQuestion(deps: {
	quizzes: QuizRepository;
	questions: QuestionRepository;
	versions: Pick<QuizVersionRepository, "find" | "listByQuiz">;
	storage: Pick<ObjectStorage, "exists" | "delete">;
	clock: Clock;
}): EditQuestion {
	return async ({ questionId, patch, ...ref }) => {
		const { quiz, questions } = await loadEditableQuiz(deps, ref);
		const current = questions.find((question) => question.id === questionId);
		if (!current) {
			throw new QuestionNotFoundError("Question not found in this quiz");
		}
		const question = patchedQuestion(current, patch);
		if (question.image && question.image.key !== current.image?.key) {
			await assertUsableImage(deps.storage, question.image.key, quiz.ownerId);
		}
		const list = questions.map((item) =>
			item.id === question.id ? question : item,
		);

		await deps.questions.saveQuestion(quiz.id, question);
		await markQuizEdited(deps, quiz, list);
		await releaseUnusedImages(deps, quiz.id, questions, list);

		return { question: toQuestionView(question) };
	};
}
