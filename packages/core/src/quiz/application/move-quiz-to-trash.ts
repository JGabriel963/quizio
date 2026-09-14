import type { Clock } from "../../shared/application/ports/clock";
import { requireOwnedQuiz, trashQuiz } from "../domain/quiz";
import type { QuizRepository } from "./ports/quiz-repository";
import type { QuizReference } from "./quiz-reference";

export type MoveQuizToTrash = (input: QuizReference) => Promise<void>;

export function createMoveQuizToTrash(deps: {
	quizzes: QuizRepository;
	clock: Clock;
}): MoveQuizToTrash {
	return async ({ ownerId, quizId }) => {
		const quiz = requireOwnedQuiz(await deps.quizzes.findById(quizId), ownerId);
		const trashed = trashQuiz(quiz, deps.clock.now());
		if (trashed !== quiz) {
			await deps.quizzes.save(trashed);
		}
	};
}
