import { createMiddleware, createStart } from "@tanstack/react-start";

import { withSecurityHeaders } from "@/lib/security-headers";

/** Every response, pages and server routes alike, on Vercel and on a VPS (audit L10). */
const securityHeaders = createMiddleware({ type: "request" }).server(
	async ({ next }) => {
		const result = await next();
		return { ...result, response: withSecurityHeaders(result.response) };
	},
);

export const startInstance = createStart(() => ({
	requestMiddleware: [securityHeaders],
}));
