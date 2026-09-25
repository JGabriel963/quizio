import type { Quiz } from "../../domain/quiz";

export interface QuizRepository {
	findById(id: string): Promise<Quiz | null>;
	/** Inserts or replaces the whole quiz. */
	save(quiz: Quiz): Promise<void>;
	/**
	 * Sets only `updatedAt`. Editor operations mark the quiz edited with this,
	 * so they never overwrite a concurrent change to its details (spec 003).
	 */
	touch(id: string, updatedAt: Date): Promise<void>;
	delete(id: string): Promise<void>;
}
