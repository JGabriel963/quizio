import { getContainer, mcpSettings } from "@quizio/api/composition-root";
import { createQuizioMcpHandler } from "@quizio/mcp/handler";
import { quizioLinks } from "@quizio/mcp/links";
import { createFileRoute } from "@tanstack/react-router";

let handler: ((request: Request) => Promise<Response>) | undefined;

/** Built once per server instance, as the container is. */
function mcpHandler() {
	handler ??= createQuizioMcpHandler({
		useCases: getContainer().useCases,
		links: quizioLinks(mcpSettings.publicUrl),
		resourceMetadataUrl: `${mcpSettings.publicUrl}/.well-known/oauth-protected-resource/mcp`,
		onError: (error) => console.error("MCP tool failed", error),
	});
	return handler;
}

/** The MCP server AI agents connect to (spec 044, RN-01; ADR 0023). */
export const Route = createFileRoute("/mcp")({
	server: {
		handlers: {
			GET: ({ request }) => mcpHandler()(request),
			POST: ({ request }) => mcpHandler()(request),
			DELETE: ({ request }) => mcpHandler()(request),
			OPTIONS: ({ request }) => mcpHandler()(request),
		},
	},
});
