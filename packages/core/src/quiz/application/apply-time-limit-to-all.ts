import type { Clock } from "../../shared/application/ports/clock";
import { parseTimeLimit } from "../domain/question";
import { loadEditableQuiz, markQuizEdited } from "./editable-quiz";
import type { QuestionRepository } from "./ports/question-repository";
import type { QuizRepository } from "./ports/quiz-repository";
import type { QuizReference } from "./quiz-reference";

export interface ApplyTimeLimitToAllInput extends QuizReference {
	seconds: number;
}

/** "Aplicar a todas as perguntas" (spec 004, RN-11). */
export type ApplyTimeLimitToAll = (
	input: ApplyTimeLimitToAllInput,
) => Promise<{ updatedCount: number }>;

export function createApplyTimeLimitToAll(deps: {
	quizzes: QuizRepository;
	questions: QuestionRepository;
	clock: Clock;
}): ApplyTimeLimitToAll {
	return async ({ seconds, ...ref }) => {
		const timeLimitSeconds = parseTimeLimit(seconds);
		const { quiz, questions } = await loadEditableQuiz(deps, ref);
		const list = questions.map((question) => ({
			...question,
			timeLimitSeconds,
		}));

		await deps.questions.saveList(quiz.id, list);
		await markQuizEdited(deps, quiz);

		return { updatedCount: list.length };
	};
}
