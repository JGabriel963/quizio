import type { QuizVersionRepository } from "../application/ports/quiz-version-repository";
import type { QuizVersion } from "../domain/quiz-version";

export class InMemoryQuizVersionRepository implements QuizVersionRepository {
	readonly #versions = new Map<string, QuizVersion>();

	async find(quizId: string, number: number): Promise<QuizVersion | null> {
		return this.#versions.get(keyOf(quizId, number)) ?? null;
	}

	async save(version: QuizVersion): Promise<void> {
		this.#versions.set(keyOf(version.quizId, version.number), version);
	}

	async deleteAllOfQuiz(quizId: string): Promise<void> {
		for (const [key, version] of this.#versions) {
			if (version.quizId === quizId) {
				this.#versions.delete(key);
			}
		}
	}

	async listByQuiz(quizId: string): Promise<QuizVersion[]> {
		return this.allOf(quizId);
	}

	/** Test helper: the quiz's versions, oldest first. */
	allOf(quizId: string): QuizVersion[] {
		return [...this.#versions.values()]
			.filter((version) => version.quizId === quizId)
			.toSorted((a, b) => a.number - b.number);
	}
}

function keyOf(quizId: string, number: number): string {
	return `${quizId}#${number}`;
}
