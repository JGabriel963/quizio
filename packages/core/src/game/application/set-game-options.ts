import { requireOwnedGame } from "../domain/game";
import {
	changeGameOptions,
	definedOptions,
	type GameOptions,
} from "../domain/game-options";
import { loadGame } from "./game-lifecycle";
import {
	type HostGameView,
	type HostGameViewDeps,
	loadHostGameView,
} from "./host-game-view";
import type { GameRepository } from "./ports/game-repository";
import type { HostPreferencesRepository } from "./ports/host-preferences-repository";

export type SetGameOptions = (input: {
	ownerId: string;
	gameId: string;
	/** Only the options that change. */
	options: Partial<GameOptions>;
}) => Promise<HostGameView>;

/**
 * A switch of "Configurações" (spec 012, RN-04, RN-05): it changes the game
 * at once and is kept for the host's next games. The devices are not told:
 * what changes for them comes with the next stage (RN-21).
 */
export function createSetGameOptions(
	deps: HostGameViewDeps & {
		games: GameRepository;
		preferences: Pick<HostPreferencesRepository, "save">;
	},
): SetGameOptions {
	return async ({ ownerId, gameId, options }) => {
		const game = requireOwnedGame(await loadGame(deps, gameId), ownerId);
		const change = definedOptions(options);
		// Checked against the game as it was read; what is written is only the
		// change. The game may have moved on meanwhile, and another switch may
		// have been turned at the same time: neither is undone.
		const now = deps.clock.now();
		const changed = changeGameOptions(game, change, now);
		await deps.games.saveOptions(game.id, change, now);
		await deps.preferences.save(ownerId, change);
		const latest = await loadGame(deps, gameId);
		return loadHostGameView(deps, latest ?? changed);
	};
}
