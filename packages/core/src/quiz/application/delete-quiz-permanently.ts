import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { assertPermanentlyDeletable, requireOwnedQuiz } from "../domain/quiz";
import type { QuizRepository } from "./ports/quiz-repository";
import type { QuizReference } from "./quiz-reference";

export type DeleteQuizPermanently = (input: QuizReference) => Promise<void>;

export function createDeleteQuizPermanently(deps: {
	quizzes: QuizRepository;
	storage: Pick<ObjectStorage, "delete">;
}): DeleteQuizPermanently {
	return async ({ ownerId, quizId }) => {
		const quiz = requireOwnedQuiz(await deps.quizzes.findById(quizId), ownerId);
		assertPermanentlyDeletable(quiz);

		// Cover first: object deletion is idempotent, so a failure here can be
		// retried, while deleting the row first would lose track of the object.
		if (quiz.coverImageKey) {
			await deps.storage.delete(quiz.coverImageKey);
		}
		await deps.quizzes.delete(quiz.id);
	};
}
