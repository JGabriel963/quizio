import type { AttemptLimiter } from "../../shared/application/ports/attempt-limiter";
import type { Clock } from "../../shared/application/ports/clock";
import { isAccessKeyToken } from "../domain/access-key";
import { isConnectionIdle } from "../domain/agent-connection";
import {
	AgentRateLimitedError,
	AgentUnauthorizedError,
} from "../domain/agent-errors";
import type { AgentIdentity } from "../domain/agent-identity";
import {
	AGENT_REQUEST_WINDOW_MS,
	AGENT_USAGE_WRITE_INTERVAL_MS,
	type AgentSettings,
	retryAfterSeconds,
} from "../domain/agent-settings";
import type { AccessKeyRepository } from "./ports/access-key-repository";
import type { AccessKeySecrets } from "./ports/access-key-secrets";
import type { AgentConnectionStore } from "./ports/agent-connection-store";
import type { AgentTokenVerifier } from "./ports/agent-token-verifier";

export type AdmitAgentRequest = (input: {
	/** The bearer the agent sent, or null without one. */
	token: string | null;
}) => Promise<AgentIdentity>;

/**
 * Every request to the MCP server goes through here first (spec 044, RN-06,
 * RN-16, RN-18, RN-33): the credential is proven, the connection must still
 * exist (a JWT cannot be revoked, ADR 0023) and be in use, the request counts
 * in the person's limit, and the use is recorded. A credential is proven
 * before it counts, so a forged one never spends anybody's limit.
 */
export function createAdmitAgentRequest(deps: {
	accessKeys: Pick<AccessKeyRepository, "findByHash" | "markUsed">;
	accessKeySecrets: Pick<AccessKeySecrets, "hashOf">;
	agentTokens: AgentTokenVerifier;
	agentConnections: Pick<AgentConnectionStore, "find" | "markUsed">;
	attempts: Pick<AttemptLimiter, "reserve">;
	clock: Clock;
	agentSettings: Pick<
		AgentSettings,
		"requestsPerMinute" | "connectionIdleDays"
	>;
}): AdmitAgentRequest {
	async function identify(token: string, now: Date): Promise<AgentIdentity> {
		if (isAccessKeyToken(token)) {
			const key = await deps.accessKeys.findByHash(
				deps.accessKeySecrets.hashOf(token),
			);
			if (!key) {
				throw new AgentUnauthorizedError();
			}
			return {
				userId: key.ownerId,
				credential: { kind: "key", keyId: key.id },
			};
		}
		const holder = await deps.agentTokens.verify(token);
		const connection =
			holder &&
			(await deps.agentConnections.find(holder.userId, holder.clientId));
		if (
			!connection ||
			isConnectionIdle(connection, now, deps.agentSettings.connectionIdleDays)
		) {
			throw new AgentUnauthorizedError();
		}
		return {
			userId: connection.userId,
			credential: {
				kind: "connection",
				connectionId: connection.id,
				clientId: connection.clientId,
			},
		};
	}

	async function recordUse(identity: AgentIdentity, now: Date): Promise<void> {
		const { credential } = identity;
		if (credential.kind === "key") {
			await deps.accessKeys.markUsed(
				credential.keyId,
				now,
				AGENT_USAGE_WRITE_INTERVAL_MS,
			);
		} else {
			await deps.agentConnections.markUsed(
				identity.userId,
				credential.clientId,
				now,
				AGENT_USAGE_WRITE_INTERVAL_MS,
			);
		}
	}

	return async ({ token }) => {
		if (!token) {
			throw new AgentUnauthorizedError();
		}
		const now = deps.clock.now();
		const identity = await identify(token, now);

		const admitted = await deps.attempts.reserve(
			`agent-requests:${identity.userId}`,
			AGENT_REQUEST_WINDOW_MS,
			deps.agentSettings.requestsPerMinute,
			now,
		);
		if (!admitted) {
			throw new AgentRateLimitedError(
				retryAfterSeconds(now, AGENT_REQUEST_WINDOW_MS),
			);
		}

		await recordUse(identity, now);
		return identity;
	};
}
