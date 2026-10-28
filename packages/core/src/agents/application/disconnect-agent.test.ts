import { describe, expect, it } from "vitest";

import { AgentConnectionNotFoundError } from "../domain/agent-errors";
import { agentsTestDeps } from "../testing/agents-test-deps";
import { createDisconnectAgent } from "./disconnect-agent";
import { createRevokeAllAgentAccess } from "./revoke-all-agent-access";

describe("disconnectAgent (spec 044, RN-16)", () => {
	it("disconnects the user's connection", async () => {
		const deps = agentsTestDeps();
		const connection = deps.agentConnections.connect({
			userId: "ana",
			clientId: "client-claude",
		});

		await createDisconnectAgent(deps)({
			ownerId: "ana",
			connectionId: connection.id,
		});

		expect(await deps.agentConnections.listFor("ana")).toEqual([]);
	});

	it("someone else's connection is not found", async () => {
		const deps = agentsTestDeps();
		const connection = deps.agentConnections.connect({
			userId: "ana",
			clientId: "client-claude",
		});

		await expect(
			createDisconnectAgent(deps)({
				ownerId: "bruno",
				connectionId: connection.id,
			}),
		).rejects.toBeInstanceOf(AgentConnectionNotFoundError);
		expect(await deps.agentConnections.listFor("ana")).toHaveLength(1);
	});
});

describe("revokeAllAgentAccess (spec 044, RN-17, CA-08)", () => {
	it("removes every key and connection of the user and nobody else's", async () => {
		const deps = agentsTestDeps();
		deps.agentConnections.connect({ userId: "ana", clientId: "a" });
		deps.agentConnections.connect({ userId: "ana", clientId: "b" });
		deps.agentConnections.connect({ userId: "bruno", clientId: "a" });
		await deps.accessKeys.add(
			{
				id: "k1",
				ownerId: "ana",
				name: "Script",
				start: "qz_x",
				secretHash: "h1",
				createdAt: deps.clock.now(),
				lastUsedAt: null,
			},
			20,
		);
		await deps.accessKeys.add(
			{
				id: "k2",
				ownerId: "bruno",
				name: "Script",
				start: "qz_y",
				secretHash: "h2",
				createdAt: deps.clock.now(),
				lastUsedAt: null,
			},
			20,
		);

		await createRevokeAllAgentAccess(deps)({ ownerId: "ana" });

		expect(await deps.agentConnections.listFor("ana")).toEqual([]);
		expect(await deps.accessKeys.listFor("ana")).toEqual([]);
		expect(await deps.agentConnections.listFor("bruno")).toHaveLength(1);
		expect(await deps.accessKeys.listFor("bruno")).toHaveLength(1);
	});
});
