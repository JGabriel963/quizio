import { createDb } from "@quizio/db";
import { env } from "@quizio/env/server";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { createAuth, type GoogleSignInOptions } from "./create-auth";

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
	db: createDb(),
	baseURL: env.BETTER_AUTH_URL,
	secret: env.BETTER_AUTH_SECRET,
	signUpEnabled: env.AUTH_SIGN_UP_ENABLED,
	google,
	plugins: [tanstackStartCookies()],
});
