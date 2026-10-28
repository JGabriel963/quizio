import { FixedClock } from "../../shared/testing/fixed-clock";
import { InMemoryAttemptLimiter } from "../../shared/testing/in-memory-attempt-limiter";
import { SequentialIdGenerator } from "../../shared/testing/sequential-id-generator";
import { DEFAULT_AGENT_SETTINGS } from "../domain/agent-settings";
import { FakeAccessKeySecrets } from "./fake-access-key-secrets";
import { FakeAgentTokenVerifier } from "./fake-agent-token-verifier";
import { InMemoryAccessKeyRepository } from "./in-memory-access-key-repository";
import { InMemoryAgentConnectionStore } from "./in-memory-agent-connection-store";

/** Every port the agents use cases take, over fakes, with the default limits. */
export function agentsTestDeps() {
	const deps = {
		accessKeys: new InMemoryAccessKeyRepository(),
		accessKeySecrets: new FakeAccessKeySecrets(),
		agentTokens: new FakeAgentTokenVerifier(),
		agentConnections: new InMemoryAgentConnectionStore(),
		attempts: new InMemoryAttemptLimiter(),
		clock: new FixedClock("2026-10-28T12:00:00.000Z"),
		ids: new SequentialIdGenerator("key"),
		agentSettings: { ...DEFAULT_AGENT_SETTINGS },
	};
	return deps;
}
