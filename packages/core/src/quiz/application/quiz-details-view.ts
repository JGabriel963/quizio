import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import type { Quiz, QuizStatus } from "../domain/quiz";
import type { QuizVisibility } from "../domain/quiz-details";
import type { QuestionRepository } from "./ports/question-repository";

/** What the quiz use cases return to driving adapters. */
export interface QuizDetailsView {
	id: string;
	title: string | null;
	description: string | null;
	coverImageUrl: string | null;
	visibility: QuizVisibility;
	status: QuizStatus;
	questionCount: number;
	createdAt: Date;
	updatedAt: Date;
	trashedAt: Date | null;
}

export function toQuizDetailsView(
	quiz: Quiz,
	storage: Pick<ObjectStorage, "getPublicUrl">,
	questionCount: number,
): QuizDetailsView {
	return {
		id: quiz.id,
		title: quiz.title,
		description: quiz.description,
		coverImageUrl: quiz.coverImageKey
			? storage.getPublicUrl(quiz.coverImageKey)
			: null,
		visibility: quiz.visibility,
		status: quiz.status,
		questionCount,
		createdAt: quiz.createdAt,
		updatedAt: quiz.updatedAt,
		trashedAt: quiz.trashedAt,
	};
}

/** Details view with the question count read from the repository (spec 003, RN-26). */
export async function loadQuizDetailsView(
	quiz: Quiz,
	deps: {
		questions: Pick<QuestionRepository, "countByQuiz">;
		storage: Pick<ObjectStorage, "getPublicUrl">;
	},
): Promise<QuizDetailsView> {
	return toQuizDetailsView(
		quiz,
		deps.storage,
		await deps.questions.countByQuiz(quiz.id),
	);
}
