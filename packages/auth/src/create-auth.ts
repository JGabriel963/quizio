import { cimd } from "@better-auth/cimd";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { mcp } from "@better-auth/mcp";
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
import { jwt } from "better-auth/plugins";
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
	/**
	 * Header the proxy in front of the app reports the client address in; the
	 * rate limit is keyed on it. Defaults to Better Auth's `x-forwarded-for`.
	 */
	clientIpHeader?: string;
	/**
	 * Turns Better Auth into the OAuth server AI agents connect through
	 * (spec 044, ADR 0023). Left out, there is no OAuth at all.
	 */
	agents?: AgentAuthorizationOptions;
	/**
	 * Called after a password change succeeds, to disconnect the AI agents
	 * (spec 044, RN-17).
	 */
	onPasswordChanged?: (userId: string) => Promise<void>;
	plugins?: BetterAuthPlugin[];
}

export interface AgentAuthorizationOptions {
	/** Where the agents' authorization screen lives (`/connect`). */
	consentPage: string;
	/** Where a visitor signs in first (`/login`). */
	loginPage: string;
	/** A connection unused this long can no longer refresh its tokens (RN-18). */
	refreshTokenExpiresInSeconds: number;
	/**
	 * Tests only: replaces fetching a Client ID Metadata Document from the
	 * agent's own address.
	 */
	fetchClientMetadataResource?: typeof fetchClientMetadataResource;
}

const EMAIL_CREDENTIAL_PATHS = new Set(["/sign-up/email", "/sign-in/email"]);

/** Attempts allowed per client IP before a temporary block. */
const SIGN_IN_RATE_LIMIT = { window: 60, max: 5 };

/**
 * Anyone may register an agent (RFC 7591), so registrations are kept few per
 * address (spec 044, ADR 0023).
 */
const CLIENT_REGISTRATION_RATE_LIMIT = { window: 60, max: 10 };

/** The MCP server's address, which every agent token is bound to (RFC 8707). */
export function mcpResourceOf(baseURL: string): string {
	return `${baseURL.replace(/\/$/, "")}/mcp`;
}

function agentPlugins(
	baseURL: string,
	agents: AgentAuthorizationOptions,
): BetterAuthPlugin[] {
	return [
		jwt(),
		mcp({
			loginPage: agents.loginPage,
			consentPage: agents.consentPage,
			resource: mcpResourceOf(baseURL),
			refreshTokenExpiresIn: agents.refreshTokenExpiresInSeconds,
			// Client ID Metadata Documents first, dynamic registration as the
			// fallback the MCP revision 2026-07-28 keeps.
			allowDynamicClientRegistration: true,
			allowUnauthenticatedClientRegistration: true,
			// Agents on the person's computer (Claude Code, Codex, Gemini CLI…)
			// return to a loopback address or their own scheme: native clients.
			clientRegistrationDefaultApplicationType: "infer",
		}),
		cimd({
			fetchClientMetadataResource:
				agents.fetchClientMetadataResource ?? fetchClientMetadataResource,
			metadataProfile: "mcp-2026-07-28",
		}),
	] as BetterAuthPlugin[];
}

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
	clientIpHeader,
	agents,
	onPasswordChanged,
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
		advanced: clientIpHeader
			? { ipAddress: { ipAddressHeaders: [clientIpHeader] } }
			: undefined,
		rateLimit: {
			// On even in development so the behavior is testable (spec 001, RN-07).
			enabled: true,
			// Serverless functions share no memory, so counters live in Postgres.
			storage: "database",
			customRules: {
				"/sign-in/email": SIGN_IN_RATE_LIMIT,
				"/sign-up/email": SIGN_IN_RATE_LIMIT,
				// A wrong current password counts as a wrong sign-in (spec 039, RN-23).
				"/change-password": SIGN_IN_RATE_LIMIT,
				"/oauth2/register": CLIENT_REGISTRATION_RATE_LIMIT,
			},
		},
		hooks: {
			before: createAuthMiddleware(async (ctx) => {
				if (ctx.path === "/update-user" && ctx.body) {
					checkUserUpdate(ctx.body);
					return;
				}
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
			after: createAuthMiddleware(async (ctx) => {
				// A new password also disconnects every AI agent (spec 044, RN-17).
				const userId = ctx.context.session?.user.id;
				if (
					ctx.path === "/change-password" &&
					onPasswordChanged &&
					userId &&
					!(ctx.context.returned instanceof APIError)
				) {
					await onPasswordChanged(userId);
				}
			}),
		},
		plugins: [...(agents ? agentPlugins(baseURL, agents) : []), ...plugins],
	});
}

export type Auth = ReturnType<typeof createAuth>;

/**
 * "Alterar" the name in Seu perfil follows the sign-up rules (spec 039,
 * RN-13). The photo is Quizio's own (ADR 0019): `user.image` is never set
 * by the client and never read.
 */
function checkUserUpdate(body: Record<string, unknown>): void {
	if (body.image !== undefined) {
		throw new APIError("BAD_REQUEST", {
			code: "IMAGE_NOT_ALLOWED",
			message: "The profile photo is not changed here",
		});
	}
	if (typeof body.name === "string") {
		const name = normalizeCreatorName(body.name);
		assertValidName(name);
		body.name = name;
	}
}

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
