import type { GameEndReason } from "@quizio/core/game/domain/game";

import type { GameOptionsData, HostGameData } from "./api-types";

/** What the game's channel tells the host's lobby (spec 008; ADR 0009). */
export type LobbyEvent =
	| { type: "playerJoined"; player: { id: string; nickname: string } }
	| { type: "playerRemoved"; playerId: string }
	| { type: "lockChanged"; locked: boolean }
	/** The host's own change in the settings, shown before the server answers (spec 012). */
	| { type: "optionsChanged"; options: Partial<GameOptionsData> }
	| { type: "gameEnded"; reason: GameEndReason };

/**
 * Applies an event to the lobby the query returned. Events are hints that may
 * repeat what a refetch already brought, so each one is safe to apply twice.
 */
export function applyLobbyEvent(
	view: HostGameData,
	event: LobbyEvent,
): HostGameData {
	switch (event.type) {
		case "playerJoined":
			return view.players.some((player) => player.id === event.player.id)
				? view
				: { ...view, players: [...view.players, event.player] };
		case "playerRemoved":
			return {
				...view,
				players: view.players.filter((player) => player.id !== event.playerId),
			};
		case "lockChanged":
			return { ...view, locked: event.locked };
		case "optionsChanged": {
			const options = { ...view.options, ...event.options };
			// Autoplay off: its countdowns go away at once (spec 014, RN-08,
			// RN-15). On, they come with the server's answer, which has the time.
			return options.autoplay
				? { ...view, options }
				: {
						...view,
						options,
						autoStart: null,
						stage: view.stage && { ...view.stage, autoAdvance: null },
					};
		}
		case "gameEnded":
			return view.status === "ended"
				? view
				: { ...view, status: "ended", endReason: event.reason };
	}
}
