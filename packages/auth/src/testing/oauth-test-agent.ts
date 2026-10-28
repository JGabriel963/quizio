import { createHash, randomBytes } from "node:crypto";

/**
 * An MCP client going through Better Auth's real OAuth handler, as Claude Code
 * or Codex do (spec 044): registration, authorization with PKCE, consent and
 * the code exchange. Tests only.
 */
export function oauthTestAgent(options: {
	handler: (request: Request) => Promise<Response>;
	baseURL: string;
	/** Rate limits are per address, so each test agent has its own. */
	ip: string;
	clientName?: string;
	redirectUri?: string;
}) {
	const {
		handler,
		baseURL,
		ip,
		clientName = "Claude Code",
		redirectUri = "http://localhost:4000/callback",
	} = options;
	const resource = `${baseURL}/mcp`;

	async function call(path: string, init: RequestInit = {}) {
		const response = await handler(
			new Request(`${baseURL}${path}`, {
				...init,
				headers: {
					origin: baseURL,
					"x-forwarded-for": ip,
					...((init.headers as Record<string, string>) ?? {}),
				},
			}),
		);
		const text = await response.text();
		return {
			status: response.status,
			location: response.headers.get("location"),
			body: text ? (JSON.parse(text) as Record<string, unknown>) : null,
		};
	}

	async function register(metadata: Record<string, unknown> = {}) {
		return call("/api/auth/oauth2/register", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				client_name: clientName,
				redirect_uris: [redirectUri],
				token_endpoint_auth_method: "none",
				grant_types: ["authorization_code", "refresh_token"],
				response_types: ["code"],
				...metadata,
			}),
		});
	}

	function pkce() {
		const verifier = randomBytes(32).toString("base64url");
		const challenge = createHash("sha256").update(verifier).digest("base64url");
		return { verifier, challenge };
	}

	/** Where the authorization sends the browser, with the signed query. */
	async function authorize(
		cookie: string,
		clientId: string,
		challenge: string,
		overrides: Record<string, string> = {},
	) {
		const query = new URLSearchParams({
			response_type: "code",
			client_id: clientId,
			redirect_uri: redirectUri,
			scope: "openid profile email offline_access",
			state: "state-1",
			code_challenge: challenge,
			code_challenge_method: "S256",
			resource,
			...overrides,
		});
		return call(`/api/auth/oauth2/authorize?${query}`, { headers: { cookie } });
	}

	/** Permitir (accept) or Cancelar on the consent screen. */
	async function consent(cookie: string, signedQuery: string, accept: boolean) {
		const response = await call("/api/auth/oauth2/consent", {
			method: "POST",
			headers: { "content-type": "application/json", cookie },
			body: JSON.stringify({ accept, oauth_query: signedQuery }),
		});
		return new URL(String(response.body?.url));
	}

	async function token(form: Record<string, string>) {
		return call("/api/auth/oauth2/token", {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({ resource, ...form }).toString(),
		});
	}

	/** The whole flow for a signed-in person who allows the agent. */
	async function connect(cookie: string, clientId?: string) {
		const id =
			clientId ?? String((await register()).body?.client_id ?? "missing");
		const { verifier, challenge } = pkce();
		const authorization = await authorize(cookie, id, challenge);
		const signedQuery = authorization.location?.split("?")[1] ?? "";
		const callback = await consent(cookie, signedQuery, true);
		const tokens = await token({
			grant_type: "authorization_code",
			code: callback.searchParams.get("code") ?? "",
			redirect_uri: redirectUri,
			client_id: id,
			code_verifier: verifier,
		});
		return {
			clientId: id,
			accessToken: String(tokens.body?.access_token),
			refreshToken: String(tokens.body?.refresh_token),
		};
	}

	async function refresh(clientId: string, refreshToken: string) {
		return token({
			grant_type: "refresh_token",
			refresh_token: refreshToken,
			client_id: clientId,
		});
	}

	return { call, register, pkce, authorize, consent, token, connect, refresh };
}

/** The claims of a JWT, read without checking it (tests only). */
export function jwtClaims(token: string): Record<string, unknown> {
	return JSON.parse(
		Buffer.from(token.split(".")[1] ?? "", "base64url").toString(),
	) as Record<string, unknown>;
}
