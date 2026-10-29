import { auth } from "@quizio/auth";
import { createFileRoute } from "@tanstack/react-router";

import { limitBody } from "@/lib/body-limit";

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: ({ request }) => {
				return auth.handler(request);
			},
			POST: async ({ request }) => {
				// No body larger than the limit reaches Better Auth (audit L6).
				const limited = await limitBody(request);
				return limited instanceof Response ? limited : auth.handler(limited);
			},
		},
	},
});
