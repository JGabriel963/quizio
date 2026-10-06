import type { HostPreferencesRepository } from "../application/ports/host-preferences-repository";
import {
	DEFAULT_GAME_OPTIONS,
	definedOptions,
	type GameOptions,
} from "../domain/game-options";

export class InMemoryHostPreferencesRepository
	implements HostPreferencesRepository
{
	readonly #options = new Map<string, GameOptions>();

	async find(ownerId: string): Promise<GameOptions | null> {
		const options = this.#options.get(ownerId);
		return options ? { ...options } : null;
	}

	async save(ownerId: string, change: Partial<GameOptions>): Promise<void> {
		this.#options.set(ownerId, {
			...(this.#options.get(ownerId) ?? DEFAULT_GAME_OPTIONS),
			...definedOptions(change),
		});
	}
}
