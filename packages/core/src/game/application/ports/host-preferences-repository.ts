import type { GameOptions } from "../../domain/game-options";

/**
 * The options a host left in the last game, which the next one starts with
 * (spec 012, RN-05). The host is only an id here.
 */
export interface HostPreferencesRepository {
	/** Null for a host who never changed an option. */
	find(ownerId: string): Promise<GameOptions | null>;
	/**
	 * Stores only the options given, over the ones kept (or the defaults, the
	 * first time): two saved at the same time are both kept.
	 */
	save(ownerId: string, change: Partial<GameOptions>): Promise<void>;
}
