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

/** The lobby's padlock (spec 008, RN-23, RN-24). */
export function createSetGameLocked(deps: {
	games: GameRepository;
	clock: Clock;
	realtime: RealtimePublisher;
}): SetGameLocked {
	return async ({ ownerId, gameId, locked }) => {
		const game = requireOwnedGame(await loadGame(deps, gameId), ownerId);
		const changed = setGameLocked(game, locked);
		await deps.games.save(changed);
		await publishToGame<LockChangedPayload>(
			deps.realtime,
			game.id,
			GAME_EVENTS.lockChanged,
			{ locked },
		);
		return { locked: changed.locked };
	};
}
