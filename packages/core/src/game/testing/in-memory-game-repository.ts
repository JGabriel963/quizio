import type { GameRepository } from "../application/ports/game-repository";
import type { Game } from "../domain/game";

export class InMemoryGameRepository implements GameRepository {
	readonly #games = new Map<string, Game>();

	async findById(id: string): Promise<Game | null> {
		return this.#games.get(id) ?? null;
	}

	async findUnendedByPin(pin: string): Promise<Game | null> {
		return (
			this.all().find((game) => game.pin === pin && game.endedAt === null) ??
			null
		);
	}

	async listUnendedByQuiz(quizId: string): Promise<Game[]> {
		return this.all().filter(
			(game) => game.quizId === quizId && game.endedAt === null,
		);
	}

	async create(game: Game): Promise<"created" | "pinTaken"> {
		if (await this.findUnendedByPin(game.pin)) {
			return "pinTaken";
		}
		this.#games.set(game.id, game);
		return "created";
	}

	async save(game: Game): Promise<void> {
		this.#games.set(game.id, game);
	}

	/** Test helper: every stored game, in insertion order. */
	all(): Game[] {
		return [...this.#games.values()];
	}
}
