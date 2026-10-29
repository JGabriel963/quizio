import { createRevokeAllAgentAccess } from "@quizio/core/agents/application/revoke-all-agent-access";
import { createDb } from "@quizio/db";
import { createDrizzleAccessKeyRepository } from "@quizio/db/repositories/agents/drizzle-access-key-repository";
import { createDrizzleAgentConnectionStore } from "@quizio/db/repositories/agents/drizzle-agent-connection-store";
import { clientIpHeader, env } from "@quizio/env/server";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { createAuth, type GoogleSignInOptions } from "./create-auth";

const DAY_SECONDS = 24 * 60 * 60;

const db = createDb();

/**
 * A new password disconnects every AI agent (spec 044, RN-17). Built here
 * from the repositories, since `@quizio/api` (the container) depends on this
 * package and not the other way round.
 */
const revokeAllAgentAccess = createRevokeAllAgentAccess({
	accessKeys: createDrizzleAccessKeyRepository(db),
	agentConnections: createDrizzleAgentConnectionStore(db),
});

function googleFromEnv(): GoogleSignInOptions | undefined {
	const { GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: clientSecret } =
		env;
	if (clientId && clientSecret) {
		return { clientId, clientSecret };
	}
	if (clientId || clientSecret) {
		throw new Error(
			"Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable Google sign-in, or neither to disable it",
		);
	}
	return undefined;
}

const google = googleFromEnv();

/** What the login screen may offer; exposed through the API. */
export const authSettings = {
	signUpEnabled: env.AUTH_SIGN_UP_ENABLED,
	googleEnabled: google !== undefined,
};

export const auth = createAuth({
	db,
	baseURL: env.BETTER_AUTH_URL,
	secret: env.BETTER_AUTH_SECRET,
	signUpEnabled: env.AUTH_SIGN_UP_ENABLED,
	google,
	clientIpHeader,
	// AI agents connect through OAuth (spec 044, ADR 0023).
	// Through server routes that wrap the signed query whole, since the router
	// would rewrite its repeated keys (apps/web/src/lib/oauth-flow.ts).
	agents: {
		loginPage: "/api/agents/login",
		consentPage: "/api/agents/connect",
		refreshTokenExpiresInSeconds: env.AGENT_CONNECTION_IDLE_DAYS * DAY_SECONDS,
	},
	onPasswordChanged: (userId) => revokeAllAgentAccess({ ownerId: userId }),
	plugins: [tanstackStartCookies()],
});
