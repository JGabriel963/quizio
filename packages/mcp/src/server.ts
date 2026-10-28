import { McpServer } from "@modelcontextprotocol/server";
import type { AgentIdentity } from "@quizio/core/agents/domain/agent-identity";

import {
	annotationsOf,
	type ToolDefinition,
	type UseCases,
} from "./define-tool";
import { QUIZIO_INSTRUCTIONS } from "./instructions";
import type { QuizioLinks } from "./links";
import { toolErrorResult, toolResult } from "./tool-results";
import { QUIZIO_TOOLS } from "./tools";

export interface QuizioMcpServerOptions {
	useCases: UseCases;
	identity: AgentIdentity;
	links: QuizioLinks;
	/** Every Quizio tool unless told otherwise (tests). */
	tools?: readonly ToolDefinition[];
	/** Errors that are not the person's: reported, never sent to the agent. */
	onError?: (error: Error) => void;
}

/**
 * The MCP server of one request (spec 044; ADR 0023): a driving adapter, like
 * the tRPC routers, whose tools call the container's use cases for the person
 * the agent acts for.
 */
export function createQuizioMcpServer({
	useCases,
	identity,
	links,
	tools = QUIZIO_TOOLS,
	onError,
}: QuizioMcpServerOptions): McpServer {
	const server = new McpServer(
		{ name: "quizio", title: "Quizio", version: "1.0.0" },
		{ instructions: QUIZIO_INSTRUCTIONS },
	);
	const context = { useCases, identity, links };
	for (const tool of tools) {
		server.registerTool(
			tool.name,
			{
				title: tool.title,
				description: tool.description,
				inputSchema: tool.input,
				annotations: { title: tool.title, ...annotationsOf(tool.kind) },
			},
			async (input: unknown) => {
				try {
					return toolResult(await tool.run(input as never, context));
				} catch (error) {
					return toolErrorResult(error, onError);
				}
			},
		);
	}
	return server;
}
