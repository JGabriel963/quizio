import type { GameEndReason } from "./game";

/**
 * One public channel per game (ADR 0009): what goes through it is already on
 * the host's projected screen. Events are hints; each screen's query is the truth.
 */
export function gameChannel(gameId: string): string {
	return `game-${gameId}`;
}

export const GAME_EVENTS = {
	playerJoined: "player-joined",
	playerRemoved: "player-removed",
	lockChanged: "lock-changed",
	gameEnded: "game-ended",
} as const;

export interface PlayerJoinedPayload {
	player: { id: string; nickname: string };
}

export interface PlayerRemovedPayload {
	playerId: string;
}

export interface LockChangedPayload {
	locked: boolean;
}

export interface GameEndedPayload {
	reason: GameEndReason;
}
