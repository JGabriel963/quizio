import { AgentConnectionNotFoundError } from "../domain/agent-errors";
import type { AgentConnectionStore } from "./ports/agent-connection-store";

export type DisconnectAgent = (input: {
	ownerId: string;
	connectionId: string;
}) => Promise<void>;

/** Desconectar: the agent's next request is refused (spec 044, RN-16). */
export function createDisconnectAgent(deps: {
	agentConnections: AgentConnectionStore;
}): DisconnectAgent {
	return async ({ ownerId, connectionId }) => {
		if (!(await deps.agentConnections.disconnect(ownerId, connectionId))) {
			throw new AgentConnectionNotFoundError();
		}
	};
}
