import { DomainError } from "../../shared/domain/domain-error";
import { assertGameOpen, type Game } from "./game";

/**
 * What the host chooses in "Configurações" (spec 012). They belong to the
 * game, which starts with the ones its host left in the last game (RN-05).
 * The lock is not one of them: it is never carried over (RN-06).
 */
export interface GameOptions {
	/** The statement, the image and the answer texts on the players' devices (RN-18). */
	showQuestionsOnDevices: boolean;
	randomizeQuestions: boolean;
	randomizeAnswers: boolean;
	/**
	 * The game starts and moves through the questions by itself (spec 014).
	 * The game also keeps since when: `Game.autoplaySince`.
	 */
	autoplay: boolean;
}

/** A host who never touched the settings (RN-07). */
export const DEFAULT_GAME_OPTIONS: GameOptions = {
	showQuestionsOnDevices: false,
	randomizeQuestions: false,
	randomizeAnswers: false,
	autoplay: false,
};

/** Only the options a change really carries: a key sent as undefined is no change. */
export function definedOptions(
	change: Partial<GameOptions>,
): Partial<GameOptions> {
	return Object.fromEntries(
		Object.entries(change).filter(([, value]) => value !== undefined),
	);
}

/** The random orders are drawn when the game starts: only the lobby changes them (RN-25). */
export class GameOptionsFixedError extends DomainError {
	readonly code = "GAME.OPTIONS_FIXED";
}

/**
 * `now` is the instant autoplay counts from when the change turns it on
 * (spec 014, RN-08, RN-15); one already on keeps the instant it has.
 */
export function changeGameOptions(
	game: Game,
	change: Partial<GameOptions>,
	now: Date,
): Game {
	assertGameOpen(game);
	const options = { ...game.options, ...definedOptions(change) };
	const drawn =
		options.randomizeQuestions !== game.options.randomizeQuestions ||
		options.randomizeAnswers !== game.options.randomizeAnswers;
	if (drawn && game.status !== "lobby") {
		throw new GameOptionsFixedError(
			"The random orders can only change before the game starts",
		);
	}
	const autoplaySince = options.autoplay ? (game.autoplaySince ?? now) : null;
	return { ...game, options, autoplaySince };
}
