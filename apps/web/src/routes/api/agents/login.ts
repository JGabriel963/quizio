import { createFileRoute } from "@tanstack/react-router";

import { encodeAgentRequest } from "@/lib/oauth-flow";

/**
 * Better Auth's `loginPage` for agents (spec 044, RN-03): the signed query
 * goes on to /login whole, in one parameter the router leaves alone.
 */
export const Route = createFileRoute("/api/agents/login")({
	server: {
		handlers: {
			GET: ({ request }) => {
				const signedQuery = new URL(request.url).search.replace(/^\?/, "");
				const search = new URLSearchParams({
					agent: encodeAgentRequest(signedQuery),
				});
				return new Response(null, {
					status: 302,
					headers: { location: `/login?${search}` },
				});
			},
		},
	},
});
