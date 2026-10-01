import type { GameEndReason } from "@quizio/core/game/domain/game";

import type { HostLobbyData } from "./api-types";

/** What the game's channel tells the host's lobby (spec 008; ADR 0009). */
export type LobbyEvent =
	| { type: "playerJoined"; player: { id: string; nickname: string } }
	| { type: "playerRemoved"; playerId: string }
	| { type: "lockChanged"; locked: boolean }
	| { type: "gameEnded"; reason: GameEndReason };

/**
 * Applies an event to the lobby the query returned. Events are hints that may
 * repeat what a refetch already brought, so each one is safe to apply twice.
 */
export function applyLobbyEvent(
	view: HostLobbyData,
	event: LobbyEvent,
): HostLobbyData {
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
		case "gameEnded":
			return view.status === "ended"
				? view
				: { ...view, status: "ended", endReason: event.reason };
	}
}
