import type { Clock } from "../../shared/application/ports/clock";
import type { Question } from "../domain/question";
import {
	assertQuizEditable,
	type Quiz,
	requireOwnedQuiz,
	touchQuiz,
} from "../domain/quiz";
import type { QuestionRepository } from "./ports/question-repository";
import type { QuizRepository } from "./ports/quiz-repository";
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

/**
 * Called after the questions are written: if it fails, the only effect is a
 * stale "last modified" (plan 003, Riscos). Writes `updatedAt` alone, so a
 * title autosaved meanwhile is never overwritten by this stale copy.
 */
export async function markQuizEdited(
	deps: { quizzes: QuizRepository; clock: Clock },
	quiz: Quiz,
): Promise<Quiz> {
	const touched = touchQuiz(quiz, deps.clock.now());
	await deps.quizzes.touch(touched.id, touched.updatedAt);
	return touched;
}
