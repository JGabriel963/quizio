import type { Clock } from "../../shared/application/ports/clock";
import type { IdGenerator } from "../../shared/application/ports/id-generator";
import {
	type GeneratedDraft,
	parseGeneratedQuestion,
} from "../domain/accept-generated";
import { appendGeneratedQuestions } from "../domain/question-list";
import { loadEditableQuiz, markQuizEdited } from "./editable-quiz";
import type { QuestionRepository } from "./ports/question-repository";
import type { QuizRepository } from "./ports/quiz-repository";
import type { QuizVersionRepository } from "./ports/quiz-version-repository";
import { type QuestionView, toQuestionView } from "./quiz-editor-view";
import type { QuizReference } from "./quiz-reference";

export interface AddGeneratedQuestionsInput extends QuizReference {
	/** The created questions the creator chose, as the assistant shows them. */
	questions: GeneratedDraft[];
}

export interface AddGeneratedQuestionsOutput {
	questions: QuestionView[];
	/** Where the first added question landed, to select it (RN-26). */
	firstIndex: number;
}

export type AddGeneratedQuestions = (
	input: AddGeneratedQuestionsInput,
) => Promise<AddGeneratedQuestionsOutput>;

/**
 * "Adicionar" in the creation assistant (spec 027, RN-25 to RN-29). Created
 * questions are not kept on the server, so the browser sends them back: they
 * are checked again, get new ids and the AI mark, and go in as one change.
 */
export function createAddGeneratedQuestions(deps: {
	quizzes: QuizRepository;
	questions: QuestionRepository;
	versions: Pick<QuizVersionRepository, "find">;
	ids: IdGenerator;
	clock: Clock;
}): AddGeneratedQuestions {
	return async ({ questions: drafts, ...ref }) => {
		const { quiz, questions } = await loadEditableQuiz(deps, ref);
		const added = drafts.map((draft) =>
			parseGeneratedQuestion(draft, deps.ids.generate()),
		);
		const { list, firstIndex } = appendGeneratedQuestions(questions, added);

		await deps.questions.saveList(quiz.id, list);
		await markQuizEdited(deps, quiz, list);

		return { questions: added.map(toQuestionView), firstIndex };
	};
}
