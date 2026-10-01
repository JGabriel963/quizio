import type { Clock } from "../../shared/application/ports/clock";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import {
	IncompleteQuestionsError,
	incompleteQuestions,
} from "../domain/question-issues";
import {
	publishQuiz,
	QuizTitleRequiredError,
	withFinishingTouches,
} from "../domain/quiz";
import { newQuizVersion, sameQuestionLists } from "../domain/quiz-version";
import { loadCurrentVersion, loadEditableQuiz } from "./editable-quiz";
import type { QuestionRepository } from "./ports/question-repository";
import type { QuizRepository } from "./ports/quiz-repository";
import type { QuizVersionRepository } from "./ports/quiz-version-repository";
import { type QuizDetailsView, toQuizDetailsView } from "./quiz-details-view";
import type { QuizReference } from "./quiz-reference";

export interface PublishQuizInput extends QuizReference {
	/** Typed in "Toques finais" when the quiz had no title (spec 006, RN-12). */
	details?: { title: string | null; description: string | null };
}

/** The editor's Salvar: checks the whole quiz and freezes a playable version (spec 006). */
export type PublishQuiz = (input: PublishQuizInput) => Promise<QuizDetailsView>;

export function createPublishQuiz(deps: {
	quizzes: QuizRepository;
	questions: QuestionRepository;
	versions: QuizVersionRepository;
	storage: Pick<ObjectStorage, "getPublicUrl">;
	clock: Clock;
}): PublishQuiz {
	return async ({ details, ...ref }) => {
		const { quiz: loaded, questions } = await loadEditableQuiz(deps, ref);
		const quiz = details ? withFinishingTouches(loaded, details) : loaded;

		// Questions first, the title on the next try (RN-13).
		const incomplete = incompleteQuestions(questions);
		if (incomplete.length > 0) {
			throw new IncompleteQuestionsError(
				`${incomplete.length} question(s) of the quiz are incomplete`,
			);
		}
		if (quiz.title === null) {
			throw new QuizTitleRequiredError("A quiz needs a title to be published");
		}

		const now = deps.clock.now();
		const current = await loadCurrentVersion(deps, quiz);
		if (current && sameQuestionLists(current.questions, questions)) {
			// Nothing to freeze: the version in force already is this list (RN-16).
			const settled = {
				...quiz,
				hasUnpublishedChanges: false,
				updatedAt: details ? now : quiz.updatedAt,
			};
			if (details || quiz.hasUnpublishedChanges) {
				await deps.quizzes.save(settled);
			}
			return toQuizDetailsView(settled, deps.storage, questions.length);
		}

		const published = publishQuiz(quiz, now);
		// The version first: a quiz never points to a version that does not exist.
		await deps.versions.save(
			newQuizVersion({
				quizId: published.id,
				number: published.publishedVersion as number,
				questions,
				now,
			}),
		);
		await deps.quizzes.save(published);

		return toQuizDetailsView(published, deps.storage, questions.length);
	};
}
