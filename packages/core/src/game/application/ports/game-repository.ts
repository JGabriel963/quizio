import type { Game } from "../../domain/game";
import type { GameOptions } from "../../domain/game-options";
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
	 * Stores the lock and nothing else. Each setting is written on its own
	 * (spec 012): changed during the game, it never undoes a stage written
	 * meanwhile, and two settings changed at the same time are both kept.
	 */
	saveLocked(gameId: string, locked: boolean): Promise<void>;
	/**
	 * Stores only the options given, leaving the others as they are stored.
	 * `at` is the instant autoplay counts from when the change turns it on
	 * (spec 014); one already on keeps the instant it has.
	 */
	saveOptions(
		gameId: string,
		change: Partial<GameOptions>,
		at: Date,
	): Promise<void>;
	/**
	 * Stores where the game is (status, progress, ending) only if the stored
	 * game was not ended and is still at `from`, the lobby when null. False
	 * means another request moved it first (spec 009, RN-12).
	 */
	saveIfAt(game: Game, from: StageRef | null): Promise<boolean>;
	/**
	 * Stores when the host's screen last gave a sign, and nothing else (spec
	 * 013): it is written every few seconds and must never undo a stage or a
	 * setting written meanwhile.
	 */
	saveHostSeen(gameId: string, at: Date): Promise<void>;
	/**
	 * Deletes the games of a quiz that never left the lobby, open or ended
	 * (spec 015, RN-05): the ones that started stay, as reports, when their
	 * quiz is deleted for good.
	 */
	deleteUnstartedByQuiz(quizId: string): Promise<void>;
}
