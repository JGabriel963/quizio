import type { Clock } from "../../shared/application/ports/clock";
import type { RealtimePublisher } from "../../shared/application/ports/realtime-publisher";
import { requireOwnedGame, setGameLocked } from "../domain/game";
import { GAME_EVENTS, type LockChangedPayload } from "../domain/game-events";
import { loadGame, publishToGame } from "./game-lifecycle";
import type { GameRepository } from "./ports/game-repository";

export type SetGameLocked = (input: {
	ownerId: string;
	gameId: string;
	locked: boolean;
}) => Promise<{ locked: boolean }>;

/**
 * The lobby's padlock (spec 008, RN-23, RN-24), which is also "Bloquear jogo"
 * in the settings and works during the game (spec 012, RN-08, RN-09).
 */
export function createSetGameLocked(deps: {
	games: GameRepository;
	clock: Clock;
	realtime: RealtimePublisher;
}): SetGameLocked {
	return async ({ ownerId, gameId, locked }) => {
		const game = requireOwnedGame(await loadGame(deps, gameId), ownerId);
		const changed = setGameLocked(game, locked);
		// Only the lock is written: the game may have moved on meanwhile, and
		// an option may have been changed at the same time.
		await deps.games.saveLocked(game.id, changed.locked);
		await publishToGame<LockChangedPayload>(
			deps.realtime,
			game.id,
			GAME_EVENTS.lockChanged,
			{ locked },
		);
		return { locked: changed.locked };
	};
}
