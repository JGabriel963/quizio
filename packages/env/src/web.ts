import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	clientPrefix: "VITE_",
	client: {
		// Public half of the Pusher-protocol connection (see PUSHER_* on the server).
		VITE_PUSHER_KEY: z.string().min(1),
		VITE_PUSHER_CLUSTER: z.string().min(1).default("mt1"),
		VITE_PUSHER_HOST: z.string().min(1).optional(),
		VITE_PUSHER_PORT: z.coerce.number().int().positive().optional(),
		VITE_PUSHER_USE_TLS: z.stringbool().default(true),
	},
	// Vite injects import.meta.env; this package does not load vite/client types.
	runtimeEnv: (
		import.meta as ImportMeta & { env: Record<string, string | undefined> }
	).env,
	emptyStringAsUndefined: true,
});
