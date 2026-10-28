import { auth } from "@quizio/auth";
import { createConnectRequestReader } from "@quizio/auth/connect-request";
import { agentNameOf } from "@quizio/core/agents/domain/agent-connection";
import { webAddressParts } from "@quizio/core/shared/domain/web-address";
import { env } from "@quizio/env/server";
import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { UNNAMED_AGENT } from "@/lib/agent-labels";

const readConnectRequest = createConnectRequestReader(auth, {
	secret: env.BETTER_AUTH_SECRET,
	baseURL: env.BETTER_AUTH_URL,
});

const requestHeaders = createMiddleware().server(({ next, request }) =>
	next({ context: { headers: request.headers } }),
);

/**
 * What "Conectar ao Quizio" shows (spec 044, RN-03, RN-04): the agent's name
 * and the domain it returns to, read from the signed query, or that the
 * request is not valid.
 */
export const readAgentConnectRequest = createServerFn({ method: "GET" })
	.middleware([requestHeaders])
	.validator(z.object({ signedQuery: z.string().min(1).max(8000) }))
	.handler(async ({ data, context }) => {
		const request = await readConnectRequest(data.signedQuery, context.headers);
		if (!request) {
			return { valid: false as const };
		}
		return {
			valid: true as const,
			agentName:
				agentNameOf(request.clientName, request.redirectUri) ?? UNNAMED_AGENT,
			returnDomain: request.redirectUri
				? (webAddressParts(request.redirectUri)?.host ?? null)
				: null,
		};
	});
