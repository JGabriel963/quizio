import type { Clock } from "../../shared/application/ports/clock";
import type { RealtimePublisher } from "../../shared/application/ports/realtime-publisher";
import { type GameStatus, isGameOpen, requireOwnedGame } from "../domain/game";
import { GAME_EVENTS, type HostBackPayload } from "../domain/game-events";
import { isHostAway } from "../domain/host-presence";
import { loadGame, publishToGame } from "./game-lifecycle";
import type { GameRepository } from "./ports/game-repository";

export type SignalHost = (input: {
	ownerId: string;
	gameId: string;
}) => Promise<{ status: GameStatus }>;

/**
 * The host's screen tells the server it is there, every few seconds (spec 013,
 * RN-14). It is what the players' devices go by to say "O anfitrião se
 * desconectou". A game that is over is only answered for: the screen also
 * takes the answer as the proof that it has a connection.
 */
export function createSignalHost(deps: {
	games: GameRepository;
	clock: Clock;
	realtime: RealtimePublisher;
}): SignalHost {
	return async ({ ownerId, gameId }) => {
		const game = requireOwnedGame(await loadGame(deps, gameId), ownerId);
		if (isGameOpen(game)) {
			const now = deps.clock.now();
			const wasAway = isHostAway(game, now);
			// Only this instant is written: the game may have moved on meanwhile.
			await deps.games.saveHostSeen(game.id, now);
			if (wasAway) {
				await publishToGame<HostBackPayload>(
					deps.realtime,
					game.id,
					GAME_EVENTS.hostBack,
					{},
				);
			}
		}
		return { status: game.status };
	};
}
