import type { Clock } from "../../shared/application/ports/clock";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { assertQuizEditable, requireOwnedQuiz } from "../domain/quiz";
import { assertQuizVisibility } from "../domain/quiz-details";
import type { QuestionRepository } from "./ports/question-repository";
import type { QuizRepository } from "./ports/quiz-repository";
import { loadQuizDetailsView, type QuizDetailsView } from "./quiz-details-view";
import type { QuizReference } from "./quiz-reference";

export type SetQuizVisibility = (
	input: QuizReference & { visibility: string },
) => Promise<QuizDetailsView>;

/**
 * "Visibilidade" in the library's menu (spec 039, RN-25a): only the
 * visibility changes, without opening the quiz's settings.
 */
export function createSetQuizVisibility(deps: {
	quizzes: QuizRepository;
	questions: Pick<QuestionRepository, "countByQuiz">;
	storage: Pick<ObjectStorage, "getPublicUrl">;
	clock: Clock;
}): SetQuizVisibility {
	return async ({ ownerId, quizId, visibility }) => {
		const quiz = requireOwnedQuiz(await deps.quizzes.findById(quizId), ownerId);
		assertQuizEditable(quiz);
		const change = {
			visibility: assertQuizVisibility(visibility),
			updatedAt: deps.clock.now(),
		};
		await deps.quizzes.saveVisibility(quiz.id, change);
		return loadQuizDetailsView({ ...quiz, ...change }, deps);
	};
}
