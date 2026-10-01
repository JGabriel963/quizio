import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { requireOwnedQuiz } from "../domain/quiz";
import type { QuestionRepository } from "./ports/question-repository";
import type { QuizRepository } from "./ports/quiz-repository";
import { loadQuizDetailsView, type QuizDetailsView } from "./quiz-details-view";
import type { QuizReference } from "./quiz-reference";

export type GetQuizDetails = (input: QuizReference) => Promise<QuizDetailsView>;

export function createGetQuizDetails(deps: {
	quizzes: QuizRepository;
	questions: Pick<QuestionRepository, "countByQuiz">;
	storage: Pick<ObjectStorage, "getPublicUrl">;
}): GetQuizDetails {
	return async ({ ownerId, quizId }) => {
		const quiz = requireOwnedQuiz(await deps.quizzes.findById(quizId), ownerId);
		return loadQuizDetailsView(quiz, deps);
	};
}
