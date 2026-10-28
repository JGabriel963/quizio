import type { AccessKey } from "../domain/access-key";
import { type AgentConnection, agentNameOf } from "../domain/agent-connection";
import type { AgentConnectionRecord } from "./ports/agent-connection-store";

/** A key as Chaves de acesso shows it: never the secret (spec 044, RN-15). */
export interface AccessKeyView {
	id: string;
	name: string;
	start: string;
	createdAt: Date;
	lastUsedAt: Date | null;
}

/** A connection as Agentes conectados shows it (RN-14). */
export type AgentConnectionView = Omit<AgentConnection, "clientId">;

export function toAccessKeyView({
	id,
	name,
	start,
	createdAt,
	lastUsedAt,
}: AccessKey): AccessKeyView {
	return { id, name, start, createdAt, lastUsedAt };
}

export function toAgentConnectionView(
	record: AgentConnectionRecord,
): AgentConnectionView {
	return {
		id: record.id,
		agentName: agentNameOf(record.clientName, record.redirectUri),
		connectedAt: record.connectedAt,
		lastUsedAt: record.lastUsedAt,
	};
}
