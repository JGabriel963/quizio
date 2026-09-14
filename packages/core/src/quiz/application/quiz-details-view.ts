import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import type { Quiz, QuizStatus } from "../domain/quiz";
import type { QuizVisibility } from "../domain/quiz-details";

/** What the quiz use cases return to driving adapters. */
export interface QuizDetailsView {
	id: string;
	title: string | null;
	description: string | null;
	coverImageUrl: string | null;
	visibility: QuizVisibility;
	status: QuizStatus;
	/** Always 0 until the editor feature adds questions. */
	questionCount: number;
	createdAt: Date;
	updatedAt: Date;
	trashedAt: Date | null;
}

export function toQuizDetailsView(
	quiz: Quiz,
	storage: Pick<ObjectStorage, "getPublicUrl">,
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
		questionCount: 0,
		createdAt: quiz.createdAt,
		updatedAt: quiz.updatedAt,
		trashedAt: quiz.trashedAt,
	};
}
