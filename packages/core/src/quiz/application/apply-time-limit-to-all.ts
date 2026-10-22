import type { Clock } from "../../shared/application/ports/clock";
import { fitTimeLimit, parseTimeLimit } from "../domain/question";
import { loadEditableQuiz, markQuizEdited } from "./editable-quiz";
import type { QuestionRepository } from "./ports/question-repository";
import type { QuizRepository } from "./ports/quiz-repository";
import type { QuizVersionRepository } from "./ports/quiz-version-repository";
import type { QuizReference } from "./quiz-reference";

export interface ApplyTimeLimitToAllInput extends QuizReference {
	seconds: number;
}

/**
 * "Aplicar a todas as perguntas" (spec 004, RN-11). A type that does not take
 * the time gets its shortest one (spec 031, RN-07).
 */
export type ApplyTimeLimitToAll = (
	input: ApplyTimeLimitToAllInput,
) => Promise<{ updatedCount: number }>;

export function createApplyTimeLimitToAll(deps: {
	quizzes: QuizRepository;
	questions: QuestionRepository;
	versions: Pick<QuizVersionRepository, "find">;
	clock: Clock;
}): ApplyTimeLimitToAll {
	return async ({ seconds, ...ref }) => {
		const timeLimitSeconds = parseTimeLimit(seconds);
		const { quiz, questions } = await loadEditableQuiz(deps, ref);
		const list = questions.map((question) => ({
			...question,
			timeLimitSeconds: fitTimeLimit(question.type, timeLimitSeconds),
		}));

		await deps.questions.saveList(quiz.id, list);
		await markQuizEdited(deps, quiz, list);

		return { updatedCount: list.length };
	};
}
