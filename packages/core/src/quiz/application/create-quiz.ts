import type { Clock } from "../../shared/application/ports/clock";
import type { IdGenerator } from "../../shared/application/ports/id-generator";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { blankQuestion } from "../domain/question";
import { newQuiz } from "../domain/quiz";
import { parseQuizDetails } from "../domain/quiz-details";
import { assertUsableCover } from "./assert-usable-cover";
import type { QuestionRepository } from "./ports/question-repository";
import type { QuizRepository } from "./ports/quiz-repository";
import { type QuizDetailsView, toQuizDetailsView } from "./quiz-details-view";

export interface CreateQuizInput {
	ownerId: string;
	title?: string | null;
	description?: string | null;
	visibility?: string;
	/** Key returned by a media upload the browser already completed. */
	coverImageKey?: string | null;
}

export type CreateQuiz = (input: CreateQuizInput) => Promise<QuizDetailsView>;

export function createCreateQuiz(deps: {
	quizzes: QuizRepository;
	questions: QuestionRepository;
	storage: ObjectStorage;
	ids: IdGenerator;
	clock: Clock;
}): CreateQuiz {
	return async ({ ownerId, coverImageKey = null, ...rawDetails }) => {
		const details = parseQuizDetails(rawDetails);
		if (coverImageKey) {
			await assertUsableCover(deps.storage, coverImageKey, ownerId);
		}

		const quiz = newQuiz({
			id: deps.ids.generate(),
			ownerId,
			details,
			coverImageKey,
			now: deps.clock.now(),
		});
		// Every quiz starts with a blank question to fill in (spec 003, RN-04).
		const firstQuestion = blankQuestion(deps.ids.generate());
		await deps.quizzes.save(quiz);
		await deps.questions.saveList(quiz.id, [firstQuestion]);

		return toQuizDetailsView(quiz, deps.storage, 1);
	};
}
