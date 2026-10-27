import type { Clock } from "../../shared/application/ports/clock";
import type { IdGenerator } from "../../shared/application/ports/id-generator";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { assertQuizEditable, requireOwnedQuiz } from "../domain/quiz";
import { copyQuizContent } from "./copy-quiz-content";
import type { QuestionRepository } from "./ports/question-repository";
import type { QuizRepository } from "./ports/quiz-repository";
import type { QuizDetailsView } from "./quiz-details-view";
import type { QuizReference } from "./quiz-reference";

export type DuplicateQuiz = (input: QuizReference) => Promise<QuizDetailsView>;

export function createDuplicateQuiz(deps: {
	quizzes: QuizRepository;
	questions: QuestionRepository;
	storage: ObjectStorage;
	ids: IdGenerator;
	clock: Clock;
}): DuplicateQuiz {
	return async ({ ownerId, quizId }) => {
		const source = requireOwnedQuiz(
			await deps.quizzes.findById(quizId),
			ownerId,
		);
		// Checked before touching storage so a refused copy leaves no orphan object.
		assertQuizEditable(source);
		return copyQuizContent(
			deps,
			source,
			await deps.questions.listByQuiz(source.id),
			ownerId,
		);
	};
}
