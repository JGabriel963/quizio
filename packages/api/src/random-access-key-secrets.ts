import { createHash, randomBytes } from "node:crypto";

import type { AccessKeySecrets } from "@quizio/core/agents/application/ports/access-key-secrets";
import { ACCESS_KEY_PREFIX } from "@quizio/core/agents/domain/access-key";

/** What Chaves de acesso shows again: the prefix and six characters (spec 044, RN-15). */
const START_LENGTH = ACCESS_KEY_PREFIX.length + 6;

/**
 * 256 random bits after `qz_` (spec 044, RN-05). A secret that strong needs no
 * slow hash: its SHA-256 is stored, and a request finds its key by it (ADR
 * 0023).
 */
export function createRandomAccessKeySecrets(): AccessKeySecrets {
	const hashOf = (secret: string) =>
		createHash("sha256").update(secret).digest("hex");
	return {
		create() {
			const secret = `${ACCESS_KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
			return {
				secret,
				secretHash: hashOf(secret),
				start: secret.slice(0, START_LENGTH),
			};
		},
		hashOf,
	};
}
