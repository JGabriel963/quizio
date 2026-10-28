import type { AttemptLimiter } from "../../shared/application/ports/attempt-limiter";
import type { Clock } from "../../shared/application/ports/clock";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import {
	type ThemeLookView,
	themeLookView,
} from "../../shared/application/theme-look-view";
import type { ThemeId } from "../../shared/domain/theme";
import {
	assertJoinable,
	type Game,
	type GameMode,
	GamePinNotRecognizedError,
	isGameOpen,
	TooManyPinAttemptsError,
} from "../domain/game";
import {
	PIN_ATTEMPT_LIMIT,
	PIN_ATTEMPT_WINDOW_MS,
	parseJoinPin,
} from "../domain/game-pin";
import { settleGame } from "./game-lifecycle";
import type { GameRepository } from "./ports/game-repository";

export type FindGameByPin = (input: {
	pin: string;
	/** Who is trying, for the limit on wrong PINs: the client's network address. */
	clientKey: string;
}) => Promise<{
	gameId: string;
	pin: string;
	mode: GameMode;
	/** The screens after the PIN already wear it (spec 042, RN-14). */
	themeId: ThemeId;
	/** The custom look the game copied, without the logo (spec 043, RN-26). */
	customTheme: ThemeLookView | null;
}>;

/**
 * The first step of joining (spec 008, RN-35 to RN-39). Eight digits are an
 * assignment's PIN, which leads to the activity's screen, open or ended
 * (spec 029, RN-20, CA-42).
 */
export function createFindGameByPin(deps: {
	games: Pick<
		GameRepository,
		"findUnendedByPin" | "findLatestAssignmentByPin" | "save"
	>;
	attempts: AttemptLimiter;
	storage: Pick<ObjectStorage, "getPublicUrl">;
	clock: Clock;
}): FindGameByPin {
	/** An open game of the mode; for an assignment, the last one with the PIN. */
	async function findByPin(pin: string, mode: GameMode): Promise<Game | null> {
		const stored = await deps.games.findUnendedByPin(pin);
		const game = stored ? await settleGame(deps, stored) : null;
		if (game && isGameOpen(game) && game.mode === mode) {
			return game;
		}
		return mode === "assignment"
			? deps.games.findLatestAssignmentByPin(pin)
			: null;
	}

	return async ({ pin: rawPin, clientKey }) => {
		const now = deps.clock.now();
		const attemptKey = `pin:${clientKey}`;
		// The attempt is taken before the PIN is looked up, so a burst of
		// guesses cannot all get in under the limit.
		const allowed = await deps.attempts.reserve(
			attemptKey,
			PIN_ATTEMPT_WINDOW_MS,
			PIN_ATTEMPT_LIMIT,
			now,
		);
		if (!allowed) {
			throw new TooManyPinAttemptsError("Too many wrong PINs; wait a moment");
		}

		const parsed = parseJoinPin(rawPin);
		const game = parsed ? await findByPin(parsed.pin, parsed.mode) : null;
		if (!game) {
			throw new GamePinNotRecognizedError("No open game has this PIN");
		}
		// Only wrong PINs count: a whole classroom shares one address.
		await deps.attempts.release(attemptKey, PIN_ATTEMPT_WINDOW_MS, now);
		if (game.mode === "live") {
			assertJoinable(game);
		}
		return {
			gameId: game.id,
			pin: game.pin,
			mode: game.mode,
			themeId: game.themeId,
			customTheme: themeLookView(game.customTheme, deps.storage, {
				withLogo: false,
			}),
		};
	};
}
