import { describe, expect, it } from "vitest";

import { agentsTestDeps } from "../testing/agents-test-deps";
import { createCreateAccessKey } from "./create-access-key";
import { createListAgentAccess } from "./list-agent-access";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("listAgentAccess (spec 044, RN-14, RN-15, RN-18)", () => {
	it("lists connections with the agent's name and last use, and keys with only their start", async () => {
		const deps = agentsTestDeps();
		const used = new Date("2026-10-28T11:00:00.000Z");
		const claude = deps.agentConnections.connect({
			userId: "ana",
			clientId: "client-claude",
			clientName: "Claude Code",
			lastUsedAt: used,
		});
		const chatgpt = deps.agentConnections.connect({
			userId: "ana",
			clientId: "client-chatgpt",
			redirectUri: "https://chatgpt.com/connector_platform_oauth_redirect",
		});
		deps.agentConnections.connect({ userId: "bruno", clientId: "other" });
		await createCreateAccessKey(deps)({ ownerId: "ana", name: "Script" });

		const access = await createListAgentAccess(deps)({ ownerId: "ana" });

		expect(access.connections).toEqual([
			{
				id: claude.id,
				agentName: "Claude Code",
				connectedAt: claude.connectedAt,
				lastUsedAt: used,
			},
			{
				id: chatgpt.id,
				agentName: "chatgpt.com",
				connectedAt: chatgpt.connectedAt,
				lastUsedAt: null,
			},
		]);
		expect(access.keys).toEqual([
			expect.objectContaining({ name: "Script", start: "qz_test-1" }),
		]);
		expect(JSON.stringify(access)).not.toContain("hash:");
		expect(access.keyLimit).toBe(20);
	});

	it("leaves out connections idle for 90 days", async () => {
		const deps = agentsTestDeps();
		const now = deps.clock.now();
		deps.agentConnections.connect({
			userId: "ana",
			clientId: "old",
			connectedAt: new Date(now.getTime() - 200 * DAY_MS),
			lastUsedAt: new Date(now.getTime() - 91 * DAY_MS),
		});

		const access = await createListAgentAccess(deps)({ ownerId: "ana" });

		expect(access.connections).toEqual([]);
	});
});
