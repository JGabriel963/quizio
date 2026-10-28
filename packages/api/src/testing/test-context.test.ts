import { describe, expect, it } from "vitest";

import { createTestApi } from "./test-context";

describe("createTestApi", () => {
	it("exposes the container and the agents' fakes (spec 044)", async () => {
		const api = createTestApi();
		api.agentTokens.issue("jwt-ana", { userId: "ana", clientId: "claude" });
		api.agentConnections.connect({ userId: "ana", clientId: "claude" });

		const identity = await api.container.useCases.admitAgentRequest({
			token: "jwt-ana",
		});

		expect(identity.userId).toBe("ana");
		expect(api.container.agentSettings.requestsPerMinute).toBe(120);
		expect(api.remoteFiles).toBeDefined();
		expect(api.accessKeys).toBeDefined();
	});
});
