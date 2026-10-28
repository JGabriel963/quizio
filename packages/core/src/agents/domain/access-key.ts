import { characterCount } from "../../shared/domain/text-length";
import { InvalidAccessKeyNameError } from "./agent-errors";

/** A key's name, as Criar chave asks for it (spec 044, RN-05). */
export const ACCESS_KEY_NAME_MAX_LENGTH = 50;

/**
 * Every secret starts with it: the server tells a key from an OAuth token by
 * it, and a secret scanner can recognize a leaked one.
 */
export const ACCESS_KEY_PREFIX = "qz_";

/**
 * A secret a creator made in Agentes de IA for an agent that only takes a
 * fixed key (spec 044, RN-05). The secret itself is never part of it: it is
 * shown once, when the key is made, and only its hash is stored (RN-35).
 */
export interface AccessKey {
	id: string;
	ownerId: string;
	name: string;
	/** The beginning of the secret, the only part shown again (RN-15). */
	start: string;
	createdAt: Date;
	lastUsedAt: Date | null;
}

export function parseAccessKeyName(raw: string): string {
	const name = raw.trim();
	const length = characterCount(name);
	if (length === 0 || length > ACCESS_KEY_NAME_MAX_LENGTH) {
		throw new InvalidAccessKeyNameError();
	}
	return name;
}

export function isAccessKeyToken(token: string): boolean {
	return token.startsWith(ACCESS_KEY_PREFIX);
}
