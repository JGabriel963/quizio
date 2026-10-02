import type { HostPreferencesRepository } from "../application/ports/host-preferences-repository";
import type { GameOptions } from "../domain/game-options";

export class InMemoryHostPreferencesRepository
	implements HostPreferencesRepository
{
	readonly #options = new Map<string, GameOptions>();

	async find(ownerId: string): Promise<GameOptions | null> {
		const options = this.#options.get(ownerId);
		return options ? { ...options } : null;
	}

	async save(ownerId: string, options: GameOptions): Promise<void> {
		this.#options.set(ownerId, { ...options });
	}
}
