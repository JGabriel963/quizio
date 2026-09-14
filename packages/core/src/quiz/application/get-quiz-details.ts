import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { requireOwnedQuiz } from "../domain/quiz";
import type { QuizRepository } from "./ports/quiz-repository";
import { type QuizDetailsView, toQuizDetailsView } from "./quiz-details-view";
import type { QuizReference } from "./quiz-reference";

export type GetQuizDetails = (input: QuizReference) => Promise<QuizDetailsView>;

export function createGetQuizDetails(deps: {
	quizzes: QuizRepository;
	storage: Pick<ObjectStorage, "getPublicUrl">;
}): GetQuizDetails {
	return async ({ ownerId, quizId }) => {
		const quiz = requireOwnedQuiz(await deps.quizzes.findById(quizId), ownerId);
		return toQuizDetailsView(quiz, deps.storage);
	};
}
