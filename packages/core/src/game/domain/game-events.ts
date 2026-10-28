import type { Avatar } from "./avatar";
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
	hostBack: "host-back",
	avatarChanged: "avatar-changed",
	charactersChanged: "characters-changed",
	optionsChanged: "options-changed",
} as const;

export interface PlayerJoinedPayload {
	/** The avatar is null with the characters off (spec 028). */
	player: { id: string; nickname: string; avatar: Avatar | null };
}

/** A player changed avatar while waiting (spec 028, RN-12). */
export interface AvatarChangedPayload {
	playerId: string;
	avatar: Avatar;
}

/**
 * The host turned "Personagens dos jogadores" (spec 028, RN-25). The only
 * option the devices are told about: in the lobby there is no next stage to
 * bring it, and a device must close its editor.
 */
export interface CharactersChangedPayload {
	on: boolean;
}

/**
 * The game's options changed (spec 044, RN-34): an AI agent may turn a switch
 * while the host's screen is open, so the screen asks for the game again. The
 * options themselves are in its query; the devices ignore it (spec 012, RN-21).
 */
export type OptionsChangedPayload = Record<string, never>;

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

/**
 * The host's screen gave a sign after counting as away (spec 013, RN-16).
 * Nothing tells that the host went away: no timer is there to publish it, so
 * each device learns it from its session.
 */
export type HostBackPayload = Record<string, never>;

/** Only the total: the count per answer waits for the results (RN-21). */
export interface AnswerCountPayload {
	questionIndex: number;
	count: number;
}
