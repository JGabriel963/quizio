import { createContext } from "@quizio/api/context";
import { appRouter } from "@quizio/api/routers/index";
import { createFileRoute } from "@tanstack/react-router";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { limitBody } from "@/lib/body-limit";

async function handler({ request }: { request: Request }) {
	const limited = await limitBody(request);
	if (limited instanceof Response) {
		return limited;
	}
	return fetchRequestHandler({
		req: limited,
		router: appRouter,
		createContext,
		endpoint: "/api/trpc",
		// The client gets a generic message for these (packages/api errorFormatter),
		// so what failed is only told here.
		onError({ error, path }) {
			if (error.code === "INTERNAL_SERVER_ERROR" || error.cause?.cause) {
				console.error(`tRPC ${path ?? "request"} failed`, error.cause ?? error);
			}
		},
	});
}

export const Route = createFileRoute("/api/trpc/$")({
	server: {
		handlers: {
			GET: handler,
			POST: handler,
		},
	},
});
