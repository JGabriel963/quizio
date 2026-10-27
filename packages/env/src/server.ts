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
		// Header the proxy in front of the app reports the client address in; it
		// keys the rate limits, so it must be one a client cannot set. Vercel
		// overwrites x-forwarded-for; behind your own proxy use what it sets.
		CLIENT_IP_HEADER: z.string().min(1).default("x-forwarded-for"),
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

		// Creation assistant (spec 027, ADR 0012). Without a provider it is off.
		// AI_API_KEY and AI_MODEL go with it (checked in the composition root).
		// `fake` answers fixed questions, for the E2E tests; never in production.
		AI_PROVIDER: z.enum(["anthropic", "openai", "google", "fake"]).optional(),
		AI_API_KEY: z.string().min(1).optional(),
		AI_MODEL: z.string().min(1).optional(),
		// Generations per creator in any 24 hours (RN-31).
		AI_GENERATIONS_PER_DAY: z.coerce.number().int().min(0).default(20),
		// How far ahead an assignment's deadline may be (spec 029, RN-08).
		ASSIGNMENT_MAX_DEADLINE_DAYS: z.coerce
			.number()
			.int()
			.min(1)
			.max(365)
			.default(28),
		// How long read notifications keep showing (spec 040, RN-21).
		NOTIFICATION_READ_RETENTION_DAYS: z.coerce
			.number()
			.int()
			.min(1)
			.max(365)
			.default(90),
	},
	runtimeEnv: process.env,
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	emptyStringAsUndefined: true,
});
