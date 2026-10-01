import type { GameRepository } from "../application/ports/game-repository";
import type { Game } from "../domain/game";
import { isAtStage, type StageRef } from "../domain/game-progress";

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

	async saveIfAt(game: Game, from: StageRef | null): Promise<boolean> {
		const stored = this.#games.get(game.id);
		const there =
			stored !== undefined &&
			stored.endedAt === null &&
			(from ? isAtStage(stored, from) : stored.status === "lobby");
		if (!stored || !there) {
			return false;
		}
		this.#games.set(game.id, {
			...stored,
			status: game.status,
			questionCount: game.questionCount,
			progress: game.progress,
			endedAt: game.endedAt,
			endReason: game.endReason,
		});
		return true;
	}

	/** Test helper: every stored game, in insertion order. */
	all(): Game[] {
		return [...this.#games.values()];
	}
}
