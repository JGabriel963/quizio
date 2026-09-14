import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		DATABASE_URL: z.string().min(1),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.url(),
		// Instance owner can close new sign-ups (spec 001, RN-05).
		AUTH_SIGN_UP_ENABLED: z.stringbool().default(true),
		// Google sign-in: set both or neither (checked when building auth).
		// Redirect URI: {BETTER_AUTH_URL}/api/auth/callback/google
		GOOGLE_CLIENT_ID: z.string().min(1).optional(),
		GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),

		// Object storage (S3 protocol). Production: Cloudflare R2. Local: RustFS.
		STORAGE_ENDPOINT: z.url(),
		STORAGE_REGION: z.string().min(1).default("auto"),
		STORAGE_ACCESS_KEY_ID: z.string().min(1),
		STORAGE_SECRET_ACCESS_KEY: z.string().min(1),
		STORAGE_BUCKET: z.string().min(1),
		STORAGE_PUBLIC_URL: z.url(),
		STORAGE_FORCE_PATH_STYLE: z.stringbool().default(false),

		// Realtime (Pusher protocol). Production: Pusher cloud or Soketi. Local: Soketi.
		PUSHER_APP_ID: z.string().min(1),
		PUSHER_KEY: z.string().min(1),
		PUSHER_SECRET: z.string().min(1),
		PUSHER_CLUSTER: z.string().min(1).default("mt1"),
		PUSHER_HOST: z.string().min(1).optional(),
		PUSHER_PORT: z.coerce.number().int().positive().optional(),
		PUSHER_USE_TLS: z.stringbool().default(true),
	},
	runtimeEnv: process.env,
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	emptyStringAsUndefined: true,
});
