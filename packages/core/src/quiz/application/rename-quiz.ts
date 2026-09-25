import type { Clock } from "../../shared/application/ports/clock";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { renameQuiz, requireOwnedQuiz } from "../domain/quiz";
import type { QuestionRepository } from "./ports/question-repository";
import type { QuizRepository } from "./ports/quiz-repository";
import { loadQuizDetailsView, type QuizDetailsView } from "./quiz-details-view";
import type { QuizReference } from "./quiz-reference";

export interface RenameQuizInput extends QuizReference {
	title: string | null;
}

/** Title typed in the editor header (spec 003, RN-18). */
export type RenameQuiz = (input: RenameQuizInput) => Promise<QuizDetailsView>;

export function createRenameQuiz(deps: {
	quizzes: QuizRepository;
	questions: Pick<QuestionRepository, "countByQuiz">;
	storage: Pick<ObjectStorage, "getPublicUrl">;
	clock: Clock;
}): RenameQuiz {
	return async ({ ownerId, quizId, title }) => {
		const quiz = requireOwnedQuiz(await deps.quizzes.findById(quizId), ownerId);
		const renamed = renameQuiz(quiz, title, deps.clock.now());
		await deps.quizzes.save(renamed);
		return loadQuizDetailsView(renamed, deps);
	};
}
