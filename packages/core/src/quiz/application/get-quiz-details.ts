import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import type { ThemeLookView } from "../../shared/application/theme-look-view";
import { requireOwnedQuiz } from "../domain/quiz";
import type { CustomThemeReads } from "./ports/custom-theme-reads";
import type { QuestionRepository } from "./ports/question-repository";
import type { QuizRepository } from "./ports/quiz-repository";
import { quizCustomLook } from "./quiz-custom-look";
import { loadQuizDetailsView, type QuizDetailsView } from "./quiz-details-view";
import type { QuizReference } from "./quiz-reference";

export type GetQuizDetails = (
	input: QuizReference,
) => Promise<QuizDetailsView & { customTheme: ThemeLookView | null }>;

/** The quiz's page, with the custom look for the game's opening (spec 043). */
export function createGetQuizDetails(deps: {
	quizzes: QuizRepository;
	customThemes: CustomThemeReads;
	questions: Pick<QuestionRepository, "countByQuiz">;
	storage: Pick<ObjectStorage, "getPublicUrl">;
}): GetQuizDetails {
	return async ({ ownerId, quizId }) => {
		const quiz = requireOwnedQuiz(await deps.quizzes.findById(quizId), ownerId);
		return {
			...(await loadQuizDetailsView(quiz, deps)),
			customTheme: await quizCustomLook(deps, quiz),
		};
	};
}
