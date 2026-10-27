import type { QuizRepository } from "../application/ports/quiz-repository";
import type { Quiz } from "../domain/quiz";
import type { QuizVisibility } from "../domain/quiz-details";

export class InMemoryQuizRepository implements QuizRepository {
	readonly #quizzes = new Map<string, Quiz>();

	async findById(id: string): Promise<Quiz | null> {
		return this.#quizzes.get(id) ?? null;
	}

	async save(quiz: Quiz): Promise<void> {
		this.#quizzes.set(quiz.id, quiz);
	}

	async markEdited(
		id: string,
		change: { updatedAt: Date; hasUnpublishedChanges: boolean },
	): Promise<void> {
		const quiz = this.#quizzes.get(id);
		if (quiz) {
			this.#quizzes.set(id, { ...quiz, ...change });
		}
	}

	async saveVisibility(
		id: string,
		change: { visibility: QuizVisibility; updatedAt: Date },
	): Promise<void> {
		const quiz = this.#quizzes.get(id);
		if (quiz) {
			this.#quizzes.set(id, { ...quiz, ...change });
		}
	}

	async listIdsByOwner(ownerId: string): Promise<string[]> {
		return this.all()
			.filter((quiz) => quiz.ownerId === ownerId)
			.map((quiz) => quiz.id);
	}

	async delete(id: string): Promise<void> {
		this.#quizzes.delete(id);
	}

	/** Test helper: every stored quiz. */
	all(): Quiz[] {
		return [...this.#quizzes.values()];
	}
}
