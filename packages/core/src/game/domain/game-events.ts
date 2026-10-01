import type { GameEndReason, GameStatus } from "./game";
import type { PublicStage } from "./public-stage";

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
	stageChanged: "stage-changed",
	answerCount: "answer-count",
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

/**
 * The game started, changed phase or finished (spec 009). The stage is the
 * public one: what is personal or secret comes from each screen's query.
 */
export interface StageChangedPayload {
	status: GameStatus;
	/** Null once the game is finished. */
	stage: PublicStage | null;
}

/** Only the total: the count per answer waits for the results (RN-21). */
export interface AnswerCountPayload {
	questionIndex: number;
	count: number;
}
