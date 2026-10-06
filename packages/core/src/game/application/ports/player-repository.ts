import type { Player } from "../../domain/player";

export interface PlayerRepository {
	findById(id: string): Promise<Player | null>;
	/** The players still in the game, in order of arrival. */
	listActive(gameId: string): Promise<Player[]>;
	countActive(gameId: string): Promise<number>;
	/**
	 * When the last player got in, removed ones included: removing a player
	 * must not move the lobby's countdown (spec 014, RN-07). Null for a game
	 * nobody ever joined.
	 */
	lastJoinedAt(gameId: string): Promise<Date | null>;
	/**
	 * The active players who may answer that question: who joined after its
	 * answers opened is not waited for (spec 012, RN-16).
	 */
	countEligible(gameId: string, questionIndex: number): Promise<number>;
	/**
	 * Inserts; "nicknameTaken" when the game already has that nickname key,
	 * removed players included (spec 008, RN-30, RN-42).
	 */
	add(player: Player): Promise<"added" | "nicknameTaken">;
	save(player: Player): Promise<void>;
}
