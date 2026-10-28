import { safeRedirect } from "@/lib/safe-redirect";

/**
 * An agent's authorization request crosses /login and /connect (spec 044,
 * RN-03) as Better Auth signed it. Its query has repeated keys that the
 * router would parse and write back differently, breaking the signature, so
 * `/api/agents/login` and `/api/agents/connect` wrap it whole in one
 * base64url parameter (`agent` on /login, `request` on /connect).
 */
export function encodeAgentRequest(signedQuery: string): string {
	const bytes = new TextEncoder().encode(signedQuery);
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

/** The signed query again, or null when the parameter is missing or broken. */
export function decodeAgentRequest(
	wrapped: string | undefined | null,
): string | null {
	if (!wrapped || !/^[A-Za-z0-9_-]+$/.test(wrapped)) {
		return null;
	}
	try {
		const binary = atob(wrapped.replace(/-/g, "+").replace(/_/g, "/"));
		return new TextDecoder().decode(
			Uint8Array.from(binary, (char) => char.charCodeAt(0)),
		);
	} catch {
		return null;
	}
}

/**
 * Where a sign-in leads: the authorization screen when it was asked for by an
 * agent, otherwise the page the person came from (spec 001, RN-09).
 */
export function afterSignInPath(search: {
	agent?: string;
	redirect?: string;
}): string {
	return search.agent
		? `/connect?request=${search.agent}`
		: safeRedirect(search.redirect);
}
