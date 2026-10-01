import type { Quiz } from "../../domain/quiz";

export interface QuizRepository {
	findById(id: string): Promise<Quiz | null>;
	/** Inserts or replaces the whole quiz. */
	save(quiz: Quiz): Promise<void>;
	/**
	 * Sets only the marks of an edit of the questions. Editor operations use
	 * this, so they never overwrite a concurrent change to the quiz details
	 * (spec 003); `hasUnpublishedChanges` comes with spec 006, RN-19.
	 */
	markEdited(
		id: string,
		change: { updatedAt: Date; hasUnpublishedChanges: boolean },
	): Promise<void>;
	delete(id: string): Promise<void>;
}
