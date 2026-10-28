import type { AccessKeySecrets } from "../application/ports/access-key-secrets";

/**
 * Secrets `qz_test-1-secret`, `qz_test-2-secret`…, whose start is
 * `qz_test-1`…, hashed in the open so tests can read them.
 */
export class FakeAccessKeySecrets implements AccessKeySecrets {
	#count = 0;

	create(): { secret: string; secretHash: string; start: string } {
		this.#count += 1;
		const secret = `qz_test-${this.#count}-secret`;
		return {
			secret,
			secretHash: this.hashOf(secret),
			start: secret.slice(0, 9),
		};
	}

	hashOf(secret: string): string {
		return `hash:${secret}`;
	}
}
