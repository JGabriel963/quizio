import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { createTestApi, type TestApi } from "@quizio/api/testing/test-context";

import type { ToolDefinition } from "../define-tool";
import { quizioLinks } from "../links";
import { createQuizioMcpServer } from "../server";

export const TEST_ORIGIN = "https://quizio.test";

export interface ToolCall {
	isError: boolean;
	/** The structured content, as the agent gets it. */
	data: Record<string, unknown>;
	/** The same, as text. */
	text: string;
}

/**
 * An MCP client connected in memory to the Quizio server, acting for
 * `userId`, over the real use cases and in-memory adapters of
 * `createTestApi` (spec 044).
 */
export async function connectTestClient(
	options: {
		api?: TestApi;
		userId?: string;
		tools?: readonly ToolDefinition[];
		onError?: (error: Error) => void;
	} = {},
) {
	const api = options.api ?? createTestApi();
	const userId = options.userId ?? "ana";
	const server = createQuizioMcpServer({
		useCases: api.container.useCases,
		identity: { userId, credential: { kind: "key", keyId: "test-key" } },
		links: quizioLinks(TEST_ORIGIN),
		tools: options.tools,
		onError: options.onError,
	});
	const [clientEnd, serverEnd] = InMemoryTransport.createLinkedPair();
	const client = new Client({ name: "quizio-test", version: "1.0.0" });
	await server.connect(serverEnd);
	await client.connect(clientEnd);

	async function call(
		name: string,
		args: Record<string, unknown> = {},
	): Promise<ToolCall> {
		const result = await client.callTool({ name, arguments: args });
		const block = result.content?.[0];
		return {
			isError: result.isError === true,
			data: (result.structuredContent ?? {}) as Record<string, unknown>,
			text: block?.type === "text" ? block.text : "",
		};
	}

	/** The structured content of a call that must succeed. */
	async function ok(name: string, args: Record<string, unknown> = {}) {
		const result = await call(name, args);
		if (result.isError) {
			throw new Error(`${name} failed: ${result.text}`);
		}
		return result.data;
	}

	return { api, client, call, ok, userId };
}
