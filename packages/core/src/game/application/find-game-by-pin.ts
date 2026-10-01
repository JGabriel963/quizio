import type { AttemptLimiter } from "../../shared/application/ports/attempt-limiter";
import type { Clock } from "../../shared/application/ports/clock";
import {
	assertJoinable,
	GamePinNotRecognizedError,
	isGameOpen,
	TooManyPinAttemptsError,
} from "../domain/game";
import {
	PIN_ATTEMPT_LIMIT,
	PIN_ATTEMPT_WINDOW_MS,
	parseGamePin,
} from "../domain/game-pin";
import { settleGame } from "./game-lifecycle";
import type { GameRepository } from "./ports/game-repository";

export type FindGameByPin = (input: {
	pin: string;
	/** Who is trying, for the limit on wrong PINs: the client's network address. */
	clientKey: string;
}) => Promise<{ gameId: string; pin: string }>;

/** The first step of joining (spec 008, RN-35 to RN-39). */
export function createFindGameByPin(deps: {
	games: Pick<GameRepository, "findUnendedByPin" | "save">;
	attempts: AttemptLimiter;
	clock: Clock;
}): FindGameByPin {
	return async ({ pin: rawPin, clientKey }) => {
		const now = deps.clock.now();
		const attemptKey = `pin:${clientKey}`;
		const wrongAttempts = await deps.attempts.count(
			attemptKey,
			PIN_ATTEMPT_WINDOW_MS,
			now,
		);
		if (wrongAttempts >= PIN_ATTEMPT_LIMIT) {
			throw new TooManyPinAttemptsError("Too many wrong PINs; wait a moment");
		}

		const pin = parseGamePin(rawPin);
		const stored = pin ? await deps.games.findUnendedByPin(pin) : null;
		const game = stored ? await settleGame(deps, stored) : null;
		if (!game || !isGameOpen(game)) {
			// Only wrong PINs count: a whole classroom shares one address.
			await deps.attempts.record(attemptKey, PIN_ATTEMPT_WINDOW_MS, now);
			throw new GamePinNotRecognizedError("No open game has this PIN");
		}
		assertJoinable(game);
		return { gameId: game.id, pin: game.pin };
	};
}
