import type { PlayerRepository } from "../application/ports/player-repository";
import { canAnswer, isActivePlayer, type Player } from "../domain/player";

export class InMemoryPlayerRepository implements PlayerRepository {
	/** Insertion order is the order of arrival. */
	readonly #players = new Map<string, Player>();

	async findById(id: string): Promise<Player | null> {
		return this.#players.get(id) ?? null;
	}

	async listActive(gameId: string): Promise<Player[]> {
		return this.allOf(gameId).filter(isActivePlayer);
	}

	async countActive(gameId: string): Promise<number> {
		return (await this.listActive(gameId)).length;
	}

	async countEligible(gameId: string, questionIndex: number): Promise<number> {
		return (await this.listActive(gameId)).filter((player) =>
			canAnswer(player, questionIndex),
		).length;
	}

	async add(player: Player): Promise<"added" | "nicknameTaken"> {
		const taken = this.allOf(player.gameId).some(
			(other) => other.nicknameKey === player.nicknameKey,
		);
		if (taken) {
			return "nicknameTaken";
		}
		this.#players.set(player.id, player);
		return "added";
	}

	async save(player: Player): Promise<void> {
		this.#players.set(player.id, player);
	}

	/** Test helper: every player of the game, removed ones included. */
	allOf(gameId: string): Player[] {
		return [...this.#players.values()].filter(
			(player) => player.gameId === gameId,
		);
	}
}
