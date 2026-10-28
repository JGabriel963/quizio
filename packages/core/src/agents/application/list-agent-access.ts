import type { Clock } from "../../shared/application/ports/clock";
import { isConnectionIdle } from "../domain/agent-connection";
import type { AgentSettings } from "../domain/agent-settings";
import {
	type AccessKeyView,
	type AgentConnectionView,
	toAccessKeyView,
	toAgentConnectionView,
} from "./agent-access-views";
import type { AccessKeyRepository } from "./ports/access-key-repository";
import type { AgentConnectionStore } from "./ports/agent-connection-store";

export interface AgentAccess {
	connections: AgentConnectionView[];
	keys: AccessKeyView[];
	/** How many keys one may have at once (RN-05). */
	keyLimit: number;
}

export type ListAgentAccess = (input: {
	ownerId: string;
}) => Promise<AgentAccess>;

/**
 * Agentes conectados and Chaves de acesso (spec 044, RN-14, RN-15). A
 * connection idle for too long no longer counts, so it is not listed (RN-18).
 */
export function createListAgentAccess(deps: {
	accessKeys: AccessKeyRepository;
	agentConnections: AgentConnectionStore;
	clock: Clock;
	agentSettings: Pick<AgentSettings, "maxActiveKeys" | "connectionIdleDays">;
}): ListAgentAccess {
	return async ({ ownerId }) => {
		const now = deps.clock.now();
		const [connections, keys] = await Promise.all([
			deps.agentConnections.listFor(ownerId),
			deps.accessKeys.listFor(ownerId),
		]);
		return {
			connections: connections
				.filter(
					(connection) =>
						!isConnectionIdle(
							connection,
							now,
							deps.agentSettings.connectionIdleDays,
						),
				)
				.map(toAgentConnectionView),
			keys: keys.map(toAccessKeyView),
			keyLimit: deps.agentSettings.maxActiveKeys,
		};
	};
}
