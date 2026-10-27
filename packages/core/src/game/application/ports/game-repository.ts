import type { Game, GameMode } from "../../domain/game";
import type { GameOptions } from "../../domain/game-options";
import type { StageRef } from "../../domain/game-progress";

export interface GameRepository {
	findById(id: string): Promise<Game | null>;
	/**
	 * The game that holds the PIN and was not ended. It may be past its
	 * deadline: nothing ends a game until someone loads it (ADR 0009).
	 */
	findUnendedByPin(pin: string): Promise<Game | null>;
	/**
	 * Of every mode and host, unless `modes` and `ownerId` say which (spec 029,
	 * RN-05, RN-42; spec 037, RN-19).
	 */
	listUnendedByQuiz(
		quizId: string,
		modes?: readonly GameMode[],
		ownerId?: string,
	): Promise<Game[]>;
	/**
	 * The newest assignment that had the PIN, ended or not: a PIN is freed when
	 * its assignment is over, and the activity still says so (spec 029, CA-42).
	 */
	findLatestAssignmentByPin(pin: string): Promise<Game | null>;
	/**
	 * Inserts; "taken" when another game that was not ended holds the PIN, or
	 * when the new game is live and the quiz has a live game that was not
	 * ended (spec 008, RN-07, RN-09; spec 029, RN-05).
	 */
	create(game: Game): Promise<"created" | "taken">;
	/** Rewrites the whole game: only for what ends it or settles its deadline. */
	save(game: Game): Promise<void>;
	/**
	 * Stores the lock and nothing else. Each setting is written on its own
	 * (spec 012): changed during the game, it never undoes a stage written
	 * meanwhile, and two settings changed at the same time are both kept.
	 */
	saveLocked(gameId: string, locked: boolean): Promise<void>;
	/**
	 * Stores an assignment's deadline and nothing else, only if it was not
	 * ended; false when it was (spec 029, RN-38).
	 */
	saveDeadline(gameId: string, deadline: Date): Promise<boolean>;
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
	 * Stores when the host opened or closed the answer review, and nothing else
	 * (spec 031, RN-32), only while the game is still at `from`. False means it
	 * moved first.
	 */
	saveReview(
		gameId: string,
		from: StageRef,
		review: { openedAt: Date | null; closedAt: Date | null },
	): Promise<boolean>;
	/**
	 * Deletes the games of a quiz that never left the lobby, open or ended
	 * (spec 015, RN-05): the ones that started stay, as reports, when their
	 * quiz is deleted for good.
	 */
	deleteUnstartedByQuiz(quizId: string): Promise<void>;
}
