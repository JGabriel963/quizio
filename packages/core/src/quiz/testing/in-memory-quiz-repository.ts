import type { QuizRepository } from "../application/ports/quiz-repository";
import type { Quiz } from "../domain/quiz";

export class InMemoryQuizRepository implements QuizRepository {
	readonly #quizzes = new Map<string, Quiz>();

	async findById(id: string): Promise<Quiz | null> {
		return this.#quizzes.get(id) ?? null;
	}

	async save(quiz: Quiz): Promise<void> {
		this.#quizzes.set(quiz.id, quiz);
	}

	async delete(id: string): Promise<void> {
		this.#quizzes.delete(id);
	}

	/** Test helper: every stored quiz. */
	all(): Quiz[] {
		return [...this.#quizzes.values()];
	}
}
