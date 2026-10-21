/** Who this browser is in an assignment: the pair received on joining (spec 030, RN-20). */
export interface StoredAssignmentSession {
	gameId: string;
	playerId: string;
	secret: string;
	/** For "Você é {apelido}?" on coming back (spec 030, RN-20); older ones have none. */
	nickname?: string;
}

export interface AssignmentSessionStore {
	load(gameId: string): StoredAssignmentSession | null;
	save(session: StoredAssignmentSession): void;
	clear(gameId: string): void;
}

type SessionStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const keyOf = (gameId: string) => `quizio:assignment:${gameId}`;

function isSession(value: unknown): value is StoredAssignmentSession {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const { gameId, playerId, secret, nickname } = value as Record<
		string,
		unknown
	>;
	return (
		typeof gameId === "string" &&
		typeof playerId === "string" &&
		typeof secret === "string" &&
		(nickname === undefined || typeof nickname === "string")
	);
}

/**
 * Kept per activity, by its id, which the link carries: the same browser goes
 * back to where it was. Without storage (private mode, blocked site data) the
 * participant still plays, and only leaving loses the way back.
 */
export function createAssignmentSessionStore(
	storage: SessionStorage | null,
): AssignmentSessionStore {
	const attempt = <T>(action: (storage: SessionStorage) => T, fallback: T) => {
		if (!storage) {
			return fallback;
		}
		try {
			return action(storage);
		} catch {
			return fallback;
		}
	};
	return {
		load: (gameId) =>
			attempt((store) => {
				const raw = store.getItem(keyOf(gameId));
				if (!raw) {
					return null;
				}
				try {
					const parsed: unknown = JSON.parse(raw);
					return isSession(parsed) && parsed.gameId === gameId ? parsed : null;
				} catch {
					return null;
				}
			}, null),
		save: (session) =>
			attempt(
				(store) =>
					store.setItem(keyOf(session.gameId), JSON.stringify(session)),
				undefined,
			),
		clear: (gameId) =>
			attempt((store) => store.removeItem(keyOf(gameId)), undefined),
	};
}

/** The browser's own store, or none on the server. */
export function browserAssignmentSessionStore(): AssignmentSessionStore {
	return createAssignmentSessionStore(
		typeof window === "undefined" ? null : window.localStorage,
	);
}
