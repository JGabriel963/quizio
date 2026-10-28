import type { AccessKey } from "../../domain/access-key";

/** A key as it is stored: with the hash of its secret, never the secret. */
export interface StoredAccessKey extends AccessKey {
	secretHash: string;
}

export interface AccessKeyRepository {
	/**
	 * Adds the key unless the owner already has `maxActive`, counted under a
	 * lock per owner so two keys made at once never pass it (spec 044, RN-05).
	 */
	add(key: StoredAccessKey, maxActive: number): Promise<"added" | "limit">;
	/** The owner's keys, newest first. */
	listFor(ownerId: string): Promise<AccessKey[]>;
	findByHash(secretHash: string): Promise<AccessKey | null>;
	/** False when the key is missing or someone else's. */
	revoke(ownerId: string, keyId: string): Promise<boolean>;
	revokeAllFor(ownerId: string): Promise<void>;
	/** Writes the last use only when the last write is older than `throttleMs`. */
	markUsed(keyId: string, at: Date, throttleMs: number): Promise<void>;
}
