import { auth } from "@quizio/auth";
import { createFileRoute } from "@tanstack/react-router";

/**
 * OAuth discovery for AI agents (spec 044; ADR 0023): the protected resource
 * metadata of /mcp (RFC 9728) and the authorization server metadata with the
 * issuer's path inserted (RFC 8414). Better Auth serves both; agents read them
 * from their own apps, so any origin may.
 */
async function discovery(request: Request): Promise<Response> {
	const response = await auth.handler(request);
	const headers = new Headers(response.headers);
	headers.set("access-control-allow-origin", "*");
	headers.set("access-control-allow-methods", "GET, OPTIONS");
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}

export const Route = createFileRoute("/.well-known/$")({
	server: {
		handlers: {
			GET: ({ request }) => discovery(request),
			OPTIONS: () =>
				new Response(null, {
					status: 204,
					headers: {
						"access-control-allow-origin": "*",
						"access-control-allow-methods": "GET, OPTIONS",
						"access-control-allow-headers":
							"Content-Type, Mcp-Protocol-Version",
					},
				}),
		},
	},
});
