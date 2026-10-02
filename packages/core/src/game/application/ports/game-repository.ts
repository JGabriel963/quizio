import type { Game } from "../../domain/game";
import type { StageRef } from "../../domain/game-progress";

export interface GameRepository {
	findById(id: string): Promise<Game | null>;
	/**
	 * The game that holds the PIN and was not ended. It may be past its
	 * deadline: nothing ends a game until someone loads it (ADR 0009).
	 */
	findUnendedByPin(pin: string): Promise<Game | null>;
	listUnendedByQuiz(quizId: string): Promise<Game[]>;
	/** Inserts; "pinTaken" when another game that was not ended holds the PIN. */
	create(game: Game): Promise<"created" | "pinTaken">;
	/** Rewrites the whole game: only for what ends it or settles its deadline. */
	save(game: Game): Promise<void>;
	/**
	 * Stores the lock and the options, and nothing else: a setting changed
	 * during the game never undoes a stage written meanwhile (spec 012).
	 */
	saveSettings(game: Game): Promise<void>;
	/**
	 * Stores where the game is (status, progress, ending) only if the stored
	 * game was not ended and is still at `from`, the lobby when null. False
	 * means another request moved it first (spec 009, RN-12).
	 */
	saveIfAt(game: Game, from: StageRef | null): Promise<boolean>;
}
