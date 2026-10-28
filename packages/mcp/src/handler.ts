import { createMcpHandler } from "@modelcontextprotocol/server";
import {
	AgentRateLimitedError,
	AgentUnauthorizedError,
} from "@quizio/core/agents/domain/agent-errors";
import type { AgentIdentity } from "@quizio/core/agents/domain/agent-identity";

import type { ToolDefinition, UseCases } from "./define-tool";
import type { QuizioLinks } from "./links";
import { createQuizioMcpServer } from "./server";

export interface QuizioMcpHandlerOptions {
	useCases: UseCases;
	links: QuizioLinks;
	/** `{origin}/.well-known/oauth-protected-resource/mcp` (RFC 9728). */
	resourceMetadataUrl: string;
	/** Every Quizio tool unless told otherwise (tests). */
	tools?: readonly ToolDefinition[];
	/** Errors that are not the person's: reported, never sent to the agent. */
	onError?: (error: Error) => void;
}

/**
 * Agents connect from their own apps, with a bearer and never a cookie, so
 * any origin may call (spec 044, ADR 0023).
 */
const CORS_HEADERS = {
	"access-control-allow-origin": "*",
	"access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
	"access-control-allow-headers":
		"Authorization, Content-Type, Accept, Mcp-Protocol-Version, Mcp-Session-Id, Last-Event-ID",
	"access-control-expose-headers":
		"WWW-Authenticate, Retry-After, Mcp-Session-Id, Mcp-Protocol-Version",
	"access-control-max-age": "86400",
};

function withCors(response: Response): Response {
	const headers = new Headers(response.headers);
	for (const [name, value] of Object.entries(CORS_HEADERS)) {
		headers.set(name, value);
	}
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}

function jsonRpcError(
	status: number,
	message: string,
	headers: Record<string, string>,
) {
	return new Response(
		JSON.stringify({
			jsonrpc: "2.0",
			error: { code: -32001, message },
			id: null,
		}),
		{ status, headers: { "content-type": "application/json", ...headers } },
	);
}

function bearerOf(authorization: string | null): string | null {
	const match = authorization?.match(/^Bearer\s+(.+)$/i);
	return match?.[1]?.trim() || null;
}

/**
 * The `/mcp` endpoint (spec 044; ADR 0023). Every request is admitted first:
 * without a valid credential the answer is 401 with the protected resource
 * metadata to discover the OAuth server (RFC 9728), over the limit it is 429.
 * What is admitted goes to the SDK's stateless handler, which builds one
 * server per request for the person the agent acts for, for the MCP revision
 * 2026-07-28 and the earlier stateless one alike.
 */
export function createQuizioMcpHandler(
	options: QuizioMcpHandlerOptions,
): (request: Request) => Promise<Response> {
	const { useCases, links, resourceMetadataUrl, tools, onError } = options;
	const mcp = createMcpHandler(
		(context) => {
			const identity = context.authInfo?.extra?.identity as
				| AgentIdentity
				| undefined;
			if (!identity) {
				throw new Error("An unadmitted request reached the MCP server");
			}
			return createQuizioMcpServer({
				useCases,
				identity,
				links,
				tools,
				onError,
			});
		},
		{ legacy: "stateless", responseMode: "json" },
	);

	return async (request) => {
		if (request.method === "OPTIONS") {
			return withCors(new Response(null, { status: 204 }));
		}

		const token = bearerOf(request.headers.get("authorization"));
		let identity: AgentIdentity;
		try {
			identity = await useCases.admitAgentRequest({ token });
		} catch (error) {
			if (error instanceof AgentUnauthorizedError) {
				const challenge = token
					? `Bearer error="invalid_token", resource_metadata="${resourceMetadataUrl}"`
					: `Bearer resource_metadata="${resourceMetadataUrl}"`;
				return withCors(
					jsonRpcError(401, error.message, { "www-authenticate": challenge }),
				);
			}
			if (error instanceof AgentRateLimitedError) {
				return withCors(
					jsonRpcError(429, error.message, {
						"retry-after": String(error.retryAfterSeconds),
					}),
				);
			}
			throw error;
		}

		const credential =
			identity.credential.kind === "key"
				? identity.credential.keyId
				: identity.credential.clientId;
		const response = await mcp.fetch(request, {
			authInfo: {
				token: token ?? "",
				clientId: credential,
				scopes: [],
				extra: { identity },
			},
		});
		return withCors(response);
	};
}
