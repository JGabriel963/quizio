/** What a device keeps to remain the same player of a game (ADR 0009). */
export interface StoredPlayerSession {
	gameId: string;
	playerId: string;
	secret: string;
}

/** The game this browser's player was last in, to offer the way back (spec 008, RN-44a). */
export interface LastGame {
	pin: string;
	nickname: string;
}

export interface PlayerSessionStore {
	load(pin: string): StoredPlayerSession | null;
	save(pin: string, session: StoredPlayerSession): void;
	/** Drops the session of that PIN and, if it was the last game, that too. */
	clear(pin: string): void;
	last(): LastGame | null;
	remember(game: LastGame): void;
	/** Stops offering the way back; the session itself stays. */
	forget(): void;
}

const keyOf = (pin: string) => `quizio:player:${pin}`;
const LAST_KEY = "quizio:player:last";

function isLastGame(value: unknown): value is LastGame {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const { pin, nickname } = value as Record<string, unknown>;
	return typeof pin === "string" && typeof nickname === "string";
}

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
	function last(): LastGame | null {
		try {
			const raw = storage?.getItem(LAST_KEY);
			const parsed: unknown = raw ? JSON.parse(raw) : null;
			return isLastGame(parsed) ? parsed : null;
		} catch {
			return null;
		}
	}
	function forget() {
		try {
			storage?.removeItem(LAST_KEY);
		} catch {
			// Nothing to forget.
		}
	}

	return {
		last,
		forget,
		remember(game) {
			try {
				storage?.setItem(LAST_KEY, JSON.stringify(game));
			} catch {
				// Storage full or blocked: the way back is just not offered.
			}
		},
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
			if (last()?.pin === pin) {
				forget();
			}
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
