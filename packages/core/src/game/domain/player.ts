import { nicknameKeyOf } from "./nickname";

/**
 * An anonymous participant of one game, known by a nickname. The id is public;
 * the secret proves, from the browser that joined, who the player is (ADR 0009).
 */
export interface Player {
	id: string;
	gameId: string;
	nickname: string;
	/** Unique in the game, removed players included (spec 008, RN-30, RN-42). */
	nicknameKey: string;
	secret: string;
	joinedAt: Date;
	removedAt: Date | null;
}

export function newPlayer(input: {
	id: string;
	gameId: string;
	nickname: string;
	secret: string;
	now: Date;
}): Player {
	return {
		id: input.id,
		gameId: input.gameId,
		nickname: input.nickname,
		nicknameKey: nicknameKeyOf(input.nickname),
		secret: input.secret,
		joinedAt: input.now,
		removedAt: null,
	};
}

export function isActivePlayer(player: Player): boolean {
	return player.removedAt === null;
}

/** The row stays, so the nickname stays blocked in the game (RN-30). */
export function removePlayer(player: Player, now: Date): Player {
	return isActivePlayer(player) ? { ...player, removedAt: now } : player;
}

export function hasPlayerSecret(player: Player, secret: string): boolean {
	return player.secret === secret;
}
