import type { AgentAccessData } from "@/lib/api-types";

/**
 * Whether an AI agent already reached the account (spec 044): one the person
 * allowed, or a key some agent used. A key nobody used yet connected nothing.
 */
export function hasConnectedAgent(
	access: Pick<AgentAccessData, "connections" | "keys">,
): boolean {
	return (
		access.connections.length > 0 ||
		access.keys.some((key) => key.lastUsedAt !== null)
	);
}
