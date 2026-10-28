/**
 * Makes and hashes access key secrets (spec 044, RN-05). Randomness and
 * hashing are infrastructure, so the core only asks for them.
 */
export interface AccessKeySecrets {
	/** A new `qz_…` secret, the hash that is stored and the start that is shown. */
	create(): { secret: string; secretHash: string; start: string };
	hashOf(secret: string): string;
}
