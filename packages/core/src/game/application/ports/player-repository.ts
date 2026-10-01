import type { Player } from "../../domain/player";

export interface PlayerRepository {
	findById(id: string): Promise<Player | null>;
	/** The players still in the game, in order of arrival. */
	listActive(gameId: string): Promise<Player[]>;
	countActive(gameId: string): Promise<number>;
	/**
	 * Inserts; "nicknameTaken" when the game already has that nickname key,
	 * removed players included (spec 008, RN-30, RN-42).
	 */
	add(player: Player): Promise<"added" | "nicknameTaken">;
	save(player: Player): Promise<void>;
}
