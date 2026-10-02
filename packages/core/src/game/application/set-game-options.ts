import { requireOwnedGame } from "../domain/game";
import { changeGameOptions, type GameOptions } from "../domain/game-options";
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
		const changed = changeGameOptions(game, options);
		// Only the settings are written: the game may have moved on meanwhile.
		await deps.games.saveSettings(changed);
		await deps.preferences.save(ownerId, changed.options);
		const latest = await loadGame(deps, gameId);
		return loadHostGameView(deps, latest ?? changed);
	};
}
