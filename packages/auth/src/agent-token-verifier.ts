import type { AgentTokenVerifier } from "@quizio/core/agents/application/ports/agent-token-verifier";
import {
	createLocalJWKSet,
	errors,
	type JSONWebKeySet,
	type JWTPayload,
	jwtVerify,
} from "jose";

/** How long the public keys are kept before being read again. */
const DEFAULT_KEYS_CACHE_MS = 5 * 60 * 1000;

/**
 * The public keys Better Auth signs agent tokens with, asked of its own
 * handler in this process: no request to the app's public address (ADR 0023).
 */
export function jwksFromHandler(
	auth: { handler: (request: Request) => Promise<Response> },
	baseURL: string,
): () => Promise<JSONWebKeySet> {
	return async () => {
		const response = await auth.handler(
			new Request(`${baseURL.replace(/\/$/, "")}/api/auth/jwks`),
		);
		if (!response.ok) {
			throw new Error(`Reading the JWKS failed with ${response.status}`);
		}
		return (await response.json()) as JSONWebKeySet;
	};
}

function holderOf(
	payload: JWTPayload,
): { userId: string; clientId: string } | null {
	const clientId = payload.client_id ?? payload.azp;
	return typeof payload.sub === "string" && typeof clientId === "string"
		? { userId: payload.sub, clientId }
		: null;
}

/**
 * Checks an agent's access token (spec 044, RN-02): Better Auth's signature,
 * its issuer, the MCP server as audience and the expiry. Whether the
 * connection still exists is the core's question (`admitAgentRequest`).
 */
export function createBetterAuthAgentTokenVerifier(options: {
	fetchJwks: () => Promise<JSONWebKeySet>;
	issuer: string;
	audience: string;
	/** Tests only: the instant tokens are checked at. */
	now?: () => Date;
	cacheMs?: number;
}): AgentTokenVerifier {
	const { fetchJwks, issuer, audience, now = () => new Date() } = options;
	const cacheMs = options.cacheMs ?? DEFAULT_KEYS_CACHE_MS;
	let cached: {
		keys: ReturnType<typeof createLocalJWKSet>;
		at: number;
	} | null = null;

	async function keys(fresh: boolean) {
		const at = now().getTime();
		if (fresh || !cached || at - cached.at > cacheMs) {
			cached = { keys: createLocalJWKSet(await fetchJwks()), at };
		}
		return cached.keys;
	}

	async function check(token: string, fresh: boolean) {
		const { payload } = await jwtVerify(token, await keys(fresh), {
			issuer,
			audience,
			currentDate: now(),
		});
		return holderOf(payload);
	}

	return {
		async verify(token) {
			try {
				return await check(token, false);
			} catch (error) {
				// A key rotated since the cache was filled: read the keys again once.
				if (error instanceof errors.JWKSNoMatchingKey) {
					try {
						return await check(token, true);
					} catch {
						return null;
					}
				}
				return null;
			}
		},
	};
}
