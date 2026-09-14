import {
	assertCreatorName,
	InvalidCreatorNameError,
	normalizeCreatorName,
	normalizeEmail,
	PASSWORD_LENGTH,
} from "@quizio/core/identity/domain/sign-up-rules";
import * as authSchema from "@quizio/db/schema/auth";
import type { Database } from "@quizio/db/types";
import { type BetterAuthPlugin, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import type { GoogleOptions } from "better-auth/social-providers";

export interface GoogleSignInOptions {
	clientId: string;
	clientSecret: string;
	/** Tests only: replaces verification of the Google ID token. */
	verifyIdToken?: GoogleOptions["verifyIdToken"];
	/** Tests only: replaces reading the profile from Google. */
	getUserInfo?: GoogleOptions["getUserInfo"];
}

export interface CreateAuthOptions {
	db: Database;
	baseURL: string;
	secret: string;
	/** Instance-wide switch for creating new accounts (spec 001, RN-05). */
	signUpEnabled: boolean;
	/** Google sign-in is offered only when configured. */
	google?: GoogleSignInOptions;
	plugins?: BetterAuthPlugin[];
}

const EMAIL_CREDENTIAL_PATHS = new Set(["/sign-up/email", "/sign-in/email"]);

/** Attempts allowed per client IP before a temporary block. */
const SIGN_IN_RATE_LIMIT = { window: 60, max: 5 };

/**
 * Builds the Better Auth instance from explicit options, so tests can run the
 * real handler against PGlite. Production wiring lives in `index.ts`.
 */
export function createAuth({
	db,
	baseURL,
	secret,
	signUpEnabled,
	google,
	plugins = [],
}: CreateAuthOptions) {
	return betterAuth({
		database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
		baseURL,
		secret,
		trustedOrigins: [baseURL],
		emailAndPassword: {
			enabled: true,
			minPasswordLength: PASSWORD_LENGTH.min,
			maxPasswordLength: PASSWORD_LENGTH.max,
			disableSignUp: !signUpEnabled,
		},
		socialProviders: google
			? {
					google: {
						clientId: google.clientId,
						clientSecret: google.clientSecret,
						prompt: "select_account",
						disableSignUp: !signUpEnabled,
						verifyIdToken: google.verifyIdToken,
						getUserInfo: google.getUserInfo,
					},
				}
			: {},
		account: {
			// Signing in with Google reaches the existing account with the same email
			// (spec 001, RN-04). Better Auth refuses to link when the local account's
			// email is unverified, and password sign-up does not verify emails yet, so
			// that guard is off: this is the pre-hijacking risk accepted in ADR 0007.
			// Google itself still has to report the email as verified.
			accountLinking: { enabled: true, requireLocalEmailVerified: false },
		},
		databaseHooks: {
			user: {
				create: {
					// Enforces closed sign-up on every path that creates users. The Google
					// `disableSignUp` flag is not applied to ID-token sign-in.
					before: async (newUser) => {
						if (!signUpEnabled) {
							throw new APIError("FORBIDDEN", {
								code: "SIGNUP_DISABLED",
								message: "Sign up is disabled",
							});
						}
						return { data: newUser };
					},
				},
			},
		},
		rateLimit: {
			// On even in development so the behavior is testable (spec 001, RN-07).
			enabled: true,
			// Serverless functions share no memory, so counters live in Postgres.
			storage: "database",
			customRules: {
				"/sign-in/email": SIGN_IN_RATE_LIMIT,
				"/sign-up/email": SIGN_IN_RATE_LIMIT,
			},
		},
		hooks: {
			before: createAuthMiddleware(async (ctx) => {
				if (!EMAIL_CREDENTIAL_PATHS.has(ctx.path) || !ctx.body) {
					return;
				}
				if (typeof ctx.body.email === "string") {
					ctx.body.email = normalizeEmail(ctx.body.email);
				}
				if (
					ctx.path === "/sign-up/email" &&
					typeof ctx.body.name === "string"
				) {
					ctx.body.name = normalizeCreatorName(ctx.body.name);
					assertValidName(ctx.body.name);
				}
			}),
		},
		plugins,
	});
}

export type Auth = ReturnType<typeof createAuth>;

function assertValidName(name: string): void {
	try {
		assertCreatorName(name);
	} catch (error) {
		if (error instanceof InvalidCreatorNameError) {
			throw new APIError("BAD_REQUEST", {
				code: "INVALID_NAME",
				message: error.message,
			});
		}
		throw error;
	}
}
