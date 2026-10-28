import { AccessKeyNotFoundError } from "../domain/agent-errors";
import type { AccessKeyRepository } from "./ports/access-key-repository";

export type RevokeAccessKey = (input: {
	ownerId: string;
	keyId: string;
}) => Promise<void>;

/** Revogar: the key stops working at once (spec 044, RN-16). */
export function createRevokeAccessKey(deps: {
	accessKeys: AccessKeyRepository;
}): RevokeAccessKey {
	return async ({ ownerId, keyId }) => {
		if (!(await deps.accessKeys.revoke(ownerId, keyId))) {
			throw new AccessKeyNotFoundError();
		}
	};
}
