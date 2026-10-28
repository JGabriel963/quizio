import type { AccessKeyRepository } from "./ports/access-key-repository";
import type { AgentConnectionStore } from "./ports/agent-connection-store";

export type RevokeAllAgentAccess = (input: {
	ownerId: string;
}) => Promise<void>;

/**
 * Changing the password disconnects every agent and revokes every key, as it
 * already ends the other sessions (spec 044, RN-17; spec 039, RN-22).
 */
export function createRevokeAllAgentAccess(deps: {
	accessKeys: Pick<AccessKeyRepository, "revokeAllFor">;
	agentConnections: Pick<AgentConnectionStore, "disconnectAll">;
}): RevokeAllAgentAccess {
	return async ({ ownerId }) => {
		await Promise.all([
			deps.accessKeys.revokeAllFor(ownerId),
			deps.agentConnections.disconnectAll(ownerId),
		]);
	};
}
