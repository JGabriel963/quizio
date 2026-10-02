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
}

/** A host who never touched the settings (RN-07). */
export const DEFAULT_GAME_OPTIONS: GameOptions = {
	showQuestionsOnDevices: false,
	randomizeQuestions: false,
	randomizeAnswers: false,
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

export function changeGameOptions(
	game: Game,
	change: Partial<GameOptions>,
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
	return { ...game, options };
}
