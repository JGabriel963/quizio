import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { requireOwnedQuiz, restoreQuiz } from "../domain/quiz";
import type { QuizRepository } from "./ports/quiz-repository";
import { type QuizDetailsView, toQuizDetailsView } from "./quiz-details-view";
import type { QuizReference } from "./quiz-reference";

export type RestoreQuiz = (input: QuizReference) => Promise<QuizDetailsView>;

export function createRestoreQuiz(deps: {
	quizzes: QuizRepository;
	storage: Pick<ObjectStorage, "getPublicUrl">;
}): RestoreQuiz {
	return async ({ ownerId, quizId }) => {
		const quiz = requireOwnedQuiz(await deps.quizzes.findById(quizId), ownerId);
		const restored = restoreQuiz(quiz);
		if (restored !== quiz) {
			await deps.quizzes.save(restored);
		}
		return toQuizDetailsView(restored, deps.storage);
	};
}
