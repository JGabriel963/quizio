import type { Clock } from "../../shared/application/ports/clock";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import {
	applyQuestionChange,
	type QuestionChange,
	type QuestionChangeNotice,
} from "../domain/question-change";
import { QuestionNotFoundError } from "../domain/question-list";
import { loadEditableQuiz, markQuizEdited } from "./editable-quiz";
import type { QuestionRepository } from "./ports/question-repository";
import type { QuizRepository } from "./ports/quiz-repository";
import type { QuizVersionRepository } from "./ports/quiz-version-repository";
import { assertUsableImage, releaseUnusedImages } from "./question-images";
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
	versions: Pick<QuizVersionRepository, "find" | "listByQuiz">;
	storage: Pick<ObjectStorage, "exists" | "delete">;
	clock: Clock;
}): UpdateQuestion {
	return async ({ questionId, change, ...ref }) => {
		const { quiz, questions } = await loadEditableQuiz(deps, ref);
		const current = questions.find((question) => question.id === questionId);
		if (!current) {
			throw new QuestionNotFoundError("Question not found in this quiz");
		}
		if (change.kind === "image" && change.key !== null) {
			await assertUsableImage(deps.storage, change.key, quiz.ownerId);
		}
		const { question, notice } = applyQuestionChange(current, change);
		const list = questions.map((item) =>
			item.id === question.id ? question : item,
		);

		await deps.questions.saveQuestion(quiz.id, question);
		await markQuizEdited(deps, quiz, list);
		await releaseUnusedImages(deps, quiz.id, questions, list);

		return { question: toQuestionView(question), notice };
	};
}
