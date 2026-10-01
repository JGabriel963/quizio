import type { Game } from "../../domain/game";

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
	save(game: Game): Promise<void>;
}
