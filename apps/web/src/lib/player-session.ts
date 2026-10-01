/** What a device keeps to remain the same player of a game (ADR 0009). */
export interface StoredPlayerSession {
	gameId: string;
	playerId: string;
	secret: string;
}

export interface PlayerSessionStore {
	load(pin: string): StoredPlayerSession | null;
	save(pin: string, session: StoredPlayerSession): void;
	clear(pin: string): void;
}

const keyOf = (pin: string) => `quizio:player:${pin}`;

function isSession(value: unknown): value is StoredPlayerSession {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const { gameId, playerId, secret } = value as Record<string, unknown>;
	return (
		typeof gameId === "string" &&
		typeof playerId === "string" &&
		typeof secret === "string"
	);
}

/**
 * Sessions are kept per PIN, which is what the join link carries. A PIN can be
 * drawn again for another game, so whoever loads one confirms it with the
 * server. Without storage (private mode, blocked site data) the player still
 * joins, and only reloading asks for the nickname again.
 */
export function createPlayerSessionStore(
	storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null,
): PlayerSessionStore {
	return {
		load(pin) {
			try {
				const raw = storage?.getItem(keyOf(pin));
				const parsed: unknown = raw ? JSON.parse(raw) : null;
				return isSession(parsed) ? parsed : null;
			} catch {
				return null;
			}
		},
		save(pin, session) {
			try {
				storage?.setItem(keyOf(pin), JSON.stringify(session));
			} catch {
				// Storage full or blocked: the player just is not resumed on reload.
			}
		},
		clear(pin) {
			try {
				storage?.removeItem(keyOf(pin));
			} catch {
				// Nothing to clear.
			}
		},
	};
}

/** The browser's store; reading `localStorage` itself may throw. */
export function browserPlayerSessionStore(): PlayerSessionStore {
	try {
		return createPlayerSessionStore(window.localStorage);
	} catch {
		return createPlayerSessionStore(null);
	}
}
