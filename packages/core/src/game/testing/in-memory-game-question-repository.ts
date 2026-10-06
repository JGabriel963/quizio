import type { GameQuestionRepository } from "../application/ports/game-question-repository";
import type { GameQuestion } from "../domain/game-question";

export class InMemoryGameQuestionRepository implements GameQuestionRepository {
	readonly #questions = new Map<string, GameQuestion[]>();

	async saveAll(
		gameId: string,
		questions: readonly GameQuestion[],
	): Promise<void> {
		if (!this.#questions.has(gameId)) {
			this.#questions.set(gameId, [...questions]);
		}
	}

	async find(gameId: string, index: number): Promise<GameQuestion | null> {
		return (
			this.allOf(gameId).find((question) => question.index === index) ?? null
		);
	}

	/** Test helper: the questions of the game, in order. */
	allOf(gameId: string): GameQuestion[] {
		return this.#questions.get(gameId) ?? [];
	}
}
