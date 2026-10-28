import type { Clock } from "../../shared/application/ports/clock";
import type { IdGenerator } from "../../shared/application/ports/id-generator";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import {
	type QuestionDraft,
	questionFromDraft,
} from "../domain/question-draft";
import { insertQuestionsAfter } from "../domain/question-list";
import { loadEditableQuiz, markQuizEdited } from "./editable-quiz";
import type { QuestionRepository } from "./ports/question-repository";
import type { QuizRepository } from "./ports/quiz-repository";
import type { QuizVersionRepository } from "./ports/quiz-version-repository";
import { assertUsableImages } from "./question-images";
import { type QuestionView, toQuestionView } from "./quiz-editor-view";
import type { QuizReference } from "./quiz-reference";

export interface AddQuestionsInput extends QuizReference {
	/** Where they go: right after this question, or at the end when null. */
	afterQuestionId: string | null;
	questions: QuestionDraft[];
}

export interface AddQuestionsOutput {
	questions: QuestionView[];
	/** Where the first one landed. */
	firstIndex: number;
}

export type AddQuestions = (
	input: AddQuestionsInput,
) => Promise<AddQuestionsOutput>;

/**
 * An AI agent adds questions of any type in one go (spec 044, RN-21, RN-22):
 * checked by the editor's rules, made with AI, and written as one change.
 */
export function createAddQuestions(deps: {
	quizzes: QuizRepository;
	questions: QuestionRepository;
	versions: Pick<QuizVersionRepository, "find">;
	storage: Pick<ObjectStorage, "exists">;
	ids: IdGenerator;
	clock: Clock;
}): AddQuestions {
	return async ({ afterQuestionId, questions: drafts, ...ref }) => {
		const { quiz, questions } = await loadEditableQuiz(deps, ref);
		const added = drafts.map((draft) =>
			questionFromDraft(draft, deps.ids.generate()),
		);
		await assertUsableImages(deps.storage, added, quiz.ownerId);
		const { list, firstIndex } = insertQuestionsAfter(
			questions,
			afterQuestionId,
			added,
		);

		await deps.questions.saveList(quiz.id, list);
		await markQuizEdited(deps, quiz, list);

		return { questions: added.map(toQuestionView), firstIndex };
	};
}
