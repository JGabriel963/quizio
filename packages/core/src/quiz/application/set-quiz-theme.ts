import type { Clock } from "../../shared/application/ports/clock";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import {
	assertQuizEditable,
	type QuizThemeChoice,
	requireOwnedQuiz,
} from "../domain/quiz";
import type { CustomThemeReads } from "./ports/custom-theme-reads";
import type { QuestionRepository } from "./ports/question-repository";
import type { QuizRepository } from "./ports/quiz-repository";
import { loadQuizDetailsView, type QuizDetailsView } from "./quiz-details-view";
import type { QuizReference } from "./quiz-reference";
import { resolveThemeChoice } from "./theme-choice";

export type SetQuizTheme = (
	input: QuizReference & { choice: QuizThemeChoice },
) => Promise<QuizDetailsView>;

/**
 * "Temas" in the editor (spec 042, RN-06, RN-07): saved when chosen, apart
 * from the playable version, so it never marks unpublished changes. A custom
 * theme must be the owner's (spec 043, RN-21); while it is set the
 * ready-made id is standard, which is what the quiz falls back to when the
 * theme is deleted (RN-19).
 */
export function createSetQuizTheme(deps: {
	quizzes: QuizRepository;
	customThemes: CustomThemeReads;
	questions: Pick<QuestionRepository, "countByQuiz">;
	storage: Pick<ObjectStorage, "getPublicUrl">;
	clock: Clock;
}): SetQuizTheme {
	return async ({ ownerId, quizId, choice }) => {
		const quiz = requireOwnedQuiz(await deps.quizzes.findById(quizId), ownerId);
		assertQuizEditable(quiz);
		const change = {
			...(await resolveThemeChoice(deps.customThemes, ownerId, choice)),
			updatedAt: deps.clock.now(),
		};
		await deps.quizzes.saveTheme(quiz.id, change);
		return loadQuizDetailsView({ ...quiz, ...change }, deps);
	};
}
