import { describe, expect, it } from "vitest";

import { createTestApi } from "../testing/test-context";

describe("agent router (spec 044)", () => {
	it("access lists the caller's connections and keys and the server URL", async () => {
		const api = createTestApi();
		const connection = api.agentConnections.connect({
			userId: "ana",
			clientId: "claude",
			clientName: "Claude Code",
		});
		api.agentConnections.connect({ userId: "bia", clientId: "chatgpt" });
		await api.callerFor("ana").agent.createKey({ name: "Script" });

		const access = await api.callerFor("ana").agent.access();

		expect(access.serverUrl).toBe("https://quizio.test/mcp");
		expect(access.keyLimit).toBe(20);
		expect(access.connections).toEqual([
			expect.objectContaining({ id: connection.id, agentName: "Claude Code" }),
		]);
		expect(access.keys).toEqual([
			expect.objectContaining({ name: "Script", start: "qz_test-1" }),
		]);
		expect(JSON.stringify(access)).not.toContain("qz_test-1-secret");
	});

	it("createKey returns the secret once", async () => {
		const api = createTestApi();

		const created = await api.callerFor("ana").agent.createKey({
			name: "Script da escola",
		});

		expect(created.secret).toBe("qz_test-1-secret");
		expect(created.key).toMatchObject({ name: "Script da escola" });
	});

	it("createKey refuses the 21st (AGENT.KEY_LIMIT) and a bad name", async () => {
		const api = createTestApi();
		const ana = api.callerFor("ana");
		for (let index = 0; index < 20; index++) {
			await ana.agent.createKey({ name: `Chave ${index}` });
		}

		await expect(
			ana.agent.createKey({ name: "Mais uma" }),
		).rejects.toMatchObject({
			code: "BAD_REQUEST",
			cause: { code: "AGENT.KEY_LIMIT" },
		});
		await expect(
			api.callerFor("bia").agent.createKey({ name: "  " }),
		).rejects.toMatchObject({
			code: "BAD_REQUEST",
			cause: { code: "AGENT.INVALID_KEY_NAME" },
		});
	});

	it("revokeKey and disconnect act only on the caller's", async () => {
		const api = createTestApi();
		const { key } = await api
			.callerFor("ana")
			.agent.createKey({ name: "Script" });
		const connection = api.agentConnections.connect({
			userId: "ana",
			clientId: "claude",
		});

		await expect(
			api.callerFor("bia").agent.revokeKey({ keyId: key.id }),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
		await expect(
			api.callerFor("bia").agent.disconnect({ connectionId: connection.id }),
		).rejects.toMatchObject({ code: "NOT_FOUND" });

		await api.callerFor("ana").agent.revokeKey({ keyId: key.id });
		await api
			.callerFor("ana")
			.agent.disconnect({ connectionId: connection.id });

		const access = await api.callerFor("ana").agent.access();
		expect(access.keys).toEqual([]);
		expect(access.connections).toEqual([]);
	});

	it("everything needs a session", async () => {
		const visitor = createTestApi().callerFor(null);

		await expect(visitor.agent.access()).rejects.toMatchObject({
			code: "UNAUTHORIZED",
		});
		await expect(visitor.agent.createKey({ name: "x" })).rejects.toMatchObject({
			code: "UNAUTHORIZED",
		});
	});
});
