import type { GameRepository } from "../application/ports/game-repository";
import type { Game } from "../domain/game";
import { definedOptions, type GameOptions } from "../domain/game-options";
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

	async create(game: Game): Promise<"created" | "taken"> {
		const taken = this.all().some(
			(other) =>
				other.endedAt === null &&
				(other.pin === game.pin || other.quizId === game.quizId),
		);
		if (taken) {
			return "taken";
		}
		this.#games.set(game.id, game);
		return "created";
	}

	async save(game: Game): Promise<void> {
		this.#games.set(game.id, game);
	}

	async saveLocked(gameId: string, locked: boolean): Promise<void> {
		const stored = this.#games.get(gameId);
		if (stored) {
			this.#games.set(gameId, { ...stored, locked });
		}
	}

	async saveOptions(
		gameId: string,
		change: Partial<GameOptions>,
		at: Date,
	): Promise<void> {
		const stored = this.#games.get(gameId);
		if (stored) {
			const options = { ...stored.options, ...definedOptions(change) };
			this.#games.set(gameId, {
				...stored,
				options,
				autoplaySince: options.autoplay ? (stored.autoplaySince ?? at) : null,
			});
		}
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
			startedAt: game.startedAt,
			questionCount: game.questionCount,
			progress: game.progress,
			endedAt: game.endedAt,
			endReason: game.endReason,
		});
		return true;
	}

	async saveHostSeen(gameId: string, at: Date): Promise<void> {
		const stored = this.#games.get(gameId);
		if (stored) {
			this.#games.set(gameId, { ...stored, hostSeenAt: at });
		}
	}

	async deleteUnstartedByQuiz(quizId: string): Promise<void> {
		for (const game of this.all()) {
			if (game.quizId === quizId && game.questionCount === 0) {
				this.#games.delete(game.id);
			}
		}
	}

	/** Test helper: every stored game, in insertion order. */
	all(): Game[] {
		return [...this.#games.values()];
	}
}
