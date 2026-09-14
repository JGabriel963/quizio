import type { Quiz } from "../../domain/quiz";

export interface QuizRepository {
	findById(id: string): Promise<Quiz | null>;
	/** Inserts or replaces the whole quiz. */
	save(quiz: Quiz): Promise<void>;
	delete(id: string): Promise<void>;
}
