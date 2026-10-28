import {
	Client,
	StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { createTestApi, type TestApi } from "@quizio/api/testing/test-context";
import { DEFAULT_AGENT_SETTINGS } from "@quizio/core/agents/domain/agent-settings";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { defineTool } from "./define-tool";
import { createQuizioMcpHandler } from "./handler";
import { quizioLinks } from "./links";

const ORIGIN = "https://quizio.test";
const METADATA = `${ORIGIN}/.well-known/oauth-protected-resource/mcp`;

const whoami = defineTool({
	name: "whoami",
	title: "Who am I",
	description: "The person the agent acts for.",
	kind: "read",
	input: z.object({}),
	run: async (_input, { identity }) => ({ userId: identity.userId }),
});

function setup(api: TestApi = createTestApi()) {
	const handler = createQuizioMcpHandler({
		useCases: api.container.useCases,
		links: quizioLinks(ORIGIN),
		resourceMetadataUrl: METADATA,
		tools: [whoami],
	});
	return { api, handler };
}

const rpc = (body: unknown, token?: string, method = "POST") =>
	new Request(`${ORIGIN}/mcp`, {
		method,
		headers: {
			"content-type": "application/json",
			accept: "application/json, text/event-stream",
			...(token ? { authorization: `Bearer ${token}` } : {}),
		},
		body: method === "POST" ? JSON.stringify(body) : undefined,
	});

const ping = { jsonrpc: "2.0", id: 1, method: "ping" };

async function clientFor(
	handler: (request: Request) => Promise<Response>,
	token: string,
) {
	const transport = new StreamableHTTPClientTransport(
		new URL(`${ORIGIN}/mcp`),
		{
			fetch: (url, init) => handler(new Request(url, init)),
			requestInit: { headers: { authorization: `Bearer ${token}` } },
		},
	);
	const client = new Client({ name: "handler-test", version: "1.0.0" });
	await client.connect(transport);
	return client;
}

describe("createQuizioMcpHandler (spec 044, RN-06, RN-33)", () => {
	it("no bearer, an unknown key and an invalid token get 401 with WWW-Authenticate pointing to the resource metadata", async () => {
		const { handler } = setup();

		for (const token of [undefined, "qz_unknown", "not-a-jwt"]) {
			const response = await handler(rpc(ping, token));

			expect(response.status, String(token)).toBe(401);
			expect(response.headers.get("www-authenticate")).toContain(
				`resource_metadata="${METADATA}"`,
			);
		}
	});

	it("an access key lists the tools and calls one for its owner", async () => {
		const { api, handler } = setup();
		const { secret } = await api.callerFor("ana").agent.createKey({
			name: "Script",
		});

		const client = await clientFor(handler, secret);
		const { tools } = await client.listTools();
		const result = await client.callTool({ name: "whoami", arguments: {} });

		expect(tools.map((tool) => tool.name)).toEqual(["whoami"]);
		expect(result.structuredContent).toEqual({ userId: "ana" });
	});

	it("an authorized agent's token works while its connection exists", async () => {
		const { api, handler } = setup();
		api.agentConnections.connect({ userId: "bia", clientId: "claude" });
		api.agentTokens.issue("jwt-bia", { userId: "bia", clientId: "claude" });

		const client = await clientFor(handler, "jwt-bia");
		const result = await client.callTool({ name: "whoami", arguments: {} });

		expect(result.structuredContent).toEqual({ userId: "bia" });
	});

	it("a revoked key gets 401", async () => {
		const { api, handler } = setup();
		const ana = api.callerFor("ana");
		const { key, secret } = await ana.agent.createKey({ name: "Script" });
		await ana.agent.revokeKey({ keyId: key.id });

		expect((await handler(rpc(ping, secret))).status).toBe(401);
	});

	it("the request over the limit gets 429 with Retry-After", async () => {
		const { api, handler } = setup(
			createTestApi({
				agentSettings: { ...DEFAULT_AGENT_SETTINGS, requestsPerMinute: 3 },
			}),
		);
		const { secret } = await api.callerFor("ana").agent.createKey({
			name: "Script",
		});

		const statuses: number[] = [];
		let last: Response | undefined;
		for (let index = 0; index < 4; index++) {
			last = await handler(rpc(ping, secret));
			statuses.push(last.status);
		}

		expect(statuses.slice(0, 3)).toEqual([200, 200, 200]);
		expect(statuses[3]).toBe(429);
		expect(Number(last?.headers.get("retry-after"))).toBeGreaterThan(0);
	});

	it("OPTIONS answers CORS for any origin with Authorization allowed", async () => {
		const { handler } = setup();

		const response = await handler(
			new Request(`${ORIGIN}/mcp`, {
				method: "OPTIONS",
				headers: { origin: "https://claude.ai" },
			}),
		);

		expect(response.status).toBe(204);
		expect(response.headers.get("access-control-allow-origin")).toBe("*");
		expect(
			response.headers.get("access-control-allow-headers")?.toLowerCase(),
		).toContain("authorization");
		expect(
			response.headers.get("access-control-expose-headers")?.toLowerCase(),
		).toContain("www-authenticate");
	});

	it("GET and DELETE get 405", async () => {
		const { api, handler } = setup();
		const { secret } = await api.callerFor("ana").agent.createKey({
			name: "Script",
		});

		expect((await handler(rpc(null, secret, "GET"))).status).toBe(405);
		expect((await handler(rpc(null, secret, "DELETE"))).status).toBe(405);
	});
});
