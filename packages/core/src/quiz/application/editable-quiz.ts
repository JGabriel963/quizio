import type { Clock } from "../../shared/application/ports/clock";
import type { Question } from "../domain/question";
import {
	assertQuizEditable,
	markQuizChanges,
	type Quiz,
	requireOwnedQuiz,
} from "../domain/quiz";
import { type QuizVersion, sameQuestionLists } from "../domain/quiz-version";
import type { QuestionRepository } from "./ports/question-repository";
import type { QuizRepository } from "./ports/quiz-repository";
import type { QuizVersionRepository } from "./ports/quiz-version-repository";
import type { QuizReference } from "./quiz-reference";

/**
 * Shared steps of every editor operation (spec 003): the quiz must be the
 * caller's (RN-02) and out of the trash (RN-03), and every change is an edit
 * of the quiz (RN-24).
 */
export async function loadEditableQuiz(
	deps: { quizzes: QuizRepository; questions: QuestionRepository },
	{ ownerId, quizId }: QuizReference,
): Promise<{ quiz: Quiz; questions: Question[] }> {
	const quiz = requireOwnedQuiz(await deps.quizzes.findById(quizId), ownerId);
	assertQuizEditable(quiz);
	return { quiz, questions: await deps.questions.listByQuiz(quiz.id) };
}

/** The playable version in force, or null for a draft (spec 006, RN-04). */
export async function loadCurrentVersion(
	deps: { versions: Pick<QuizVersionRepository, "find"> },
	quiz: Quiz,
): Promise<QuizVersion | null> {
	return quiz.publishedVersion === null
		? null
		: deps.versions.find(quiz.id, quiz.publishedVersion);
}

/**
 * Called after the questions are written, with the resulting list: if it
 * fails, the only effect is a stale "last modified" (plan 003, Riscos). A
 * published quiz is also told whether the list now differs from its playable
 * version (spec 006, RN-19). Writes those marks alone, so a title autosaved
 * meanwhile is never overwritten by this stale copy.
 */
export async function markQuizEdited(
	deps: {
		quizzes: QuizRepository;
		versions: Pick<QuizVersionRepository, "find">;
		clock: Clock;
	},
	quiz: Quiz,
	questions: readonly Question[],
): Promise<Quiz> {
	const version = await loadCurrentVersion(deps, quiz);
	const marked = markQuizChanges(
		quiz,
		!version || !sameQuestionLists(version.questions, questions),
		deps.clock.now(),
	);
	await deps.quizzes.markEdited(marked.id, {
		updatedAt: marked.updatedAt,
		hasUnpublishedChanges: marked.hasUnpublishedChanges,
	});
	return marked;
}
