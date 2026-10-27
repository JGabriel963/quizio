import type { Clock } from "../../shared/application/ports/clock";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import {
	assertQuizEditable,
	parseThemeId,
	requireOwnedQuiz,
} from "../domain/quiz";
import type { QuestionRepository } from "./ports/question-repository";
import type { QuizRepository } from "./ports/quiz-repository";
import { loadQuizDetailsView, type QuizDetailsView } from "./quiz-details-view";
import type { QuizReference } from "./quiz-reference";

export type SetQuizTheme = (
	input: QuizReference & { themeId: string },
) => Promise<QuizDetailsView>;

/**
 * "Temas" in the editor (spec 042, RN-06, RN-07): saved when chosen, apart
 * from the playable version, so it never marks unpublished changes.
 */
export function createSetQuizTheme(deps: {
	quizzes: QuizRepository;
	questions: Pick<QuestionRepository, "countByQuiz">;
	storage: Pick<ObjectStorage, "getPublicUrl">;
	clock: Clock;
}): SetQuizTheme {
	return async ({ ownerId, quizId, themeId }) => {
		const quiz = requireOwnedQuiz(await deps.quizzes.findById(quizId), ownerId);
		assertQuizEditable(quiz);
		const change = {
			themeId: parseThemeId(themeId),
			updatedAt: deps.clock.now(),
		};
		await deps.quizzes.saveTheme(quiz.id, change);
		return loadQuizDetailsView({ ...quiz, ...change }, deps);
	};
}
