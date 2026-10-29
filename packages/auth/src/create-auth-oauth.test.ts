import { oauthConsent, user } from "@quizio/db/schema/auth";
import {
	createTestDb,
	type TestDatabase,
} from "@quizio/db/testing/create-test-db";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createConnectRequestReader } from "./connect-request";
import { type CreateAuthOptions, createAuth } from "./create-auth";
import { jwtClaims, oauthTestAgent } from "./testing/oauth-test-agent";

const BASE_URL = "http://localhost:3001";
const CIMD_CLIENT = "https://agent.example/oauth/client.json";

let nextIp = 1;
const uniqueIp = () => `203.0.113.${nextIp++}`;

describe("Better Auth as the agents' OAuth server (spec 044, ADR 0023)", () => {
	let testDb: TestDatabase;
	let auth: ReturnType<typeof createAuth>;

	const build = (overrides: Partial<CreateAuthOptions> = {}) =>
		createAuth({
			db: testDb.db,
			baseURL: BASE_URL,
			secret: "a-test-secret-with-at-least-32-characters",
			signUpEnabled: true,
			agents: {
				loginPage: "/api/agents/login",
				consentPage: "/api/agents/connect",
				refreshTokenExpiresInSeconds: 90 * 24 * 60 * 60,
				fetchClientMetadataResource: async () =>
					Response.json({
						client_id: CIMD_CLIENT,
						client_name: "VS Code",
						redirect_uris: ["http://127.0.0.1:33418/callback"],
						token_endpoint_auth_method: "none",
						grant_types: ["authorization_code", "refresh_token"],
						response_types: ["code"],
					}),
			},
			...overrides,
		});

	/** Signs a new person up and returns their session cookie and id. */
	async function signedIn(email: string, instance = auth) {
		const response = await instance.handler(
			new Request(`${BASE_URL}/api/auth/sign-up/email`, {
				method: "POST",
				headers: {
					"content-type": "application/json",
					origin: BASE_URL,
					"x-forwarded-for": uniqueIp(),
				},
				body: JSON.stringify({ name: "Ana", email, password: "12345678" }),
			}),
		);
		const body = (await response.json()) as { user: { id: string } };
		const cookie = response.headers
			.getSetCookie()
			.map((each) => each.split(";")[0])
			.join("; ");
		return { cookie, userId: body.user.id };
	}

	const agent = (
		overrides: { clientName?: string; redirectUri?: string } = {},
	) =>
		oauthTestAgent({
			handler: (request) => auth.handler(request),
			baseURL: BASE_URL,
			ip: uniqueIp(),
			...overrides,
		});

	beforeAll(async () => {
		testDb = await createTestDb();
	});

	afterAll(() => testDb.close());

	beforeEach(async () => {
		auth = build();
	});

	it("a client registers dynamically, the signed-in user consents and the code exchange with PKCE returns an access token for /mcp", async () => {
		const { cookie, userId } = await signedIn("ana@exemplo.com");
		const claude = agent();

		const registered = await claude.register();
		expect(registered.status).toBe(201);
		expect(registered.body).toMatchObject({ application_type: "native" });

		const { clientId, accessToken, refreshToken } = await claude.connect(
			cookie,
			String(registered.body?.client_id),
		);

		expect(jwtClaims(accessToken)).toMatchObject({
			sub: userId,
			client_id: clientId,
			iss: `${BASE_URL}/api/auth`,
		});
		expect(jwtClaims(accessToken).aud).toContain(`${BASE_URL}/mcp`);
		expect(refreshToken).not.toBe("undefined");
	});

	it("the authorization sends the browser to the consent page with a signed query, and a visitor to the login page", async () => {
		const { cookie } = await signedIn("bruno@exemplo.com");
		const claude = agent();
		const clientId = String((await claude.register()).body?.client_id);

		const signedInAuthorization = await claude.authorize(
			cookie,
			clientId,
			claude.pkce().challenge,
		);
		const visitorAuthorization = await claude.authorize(
			"",
			clientId,
			claude.pkce().challenge,
		);

		expect(signedInAuthorization.status).toBe(302);
		expect(signedInAuthorization.location).toMatch(
			/^\/api\/agents\/connect\?.*&sig=/,
		);
		expect(visitorAuthorization.location).toMatch(
			/^\/api\/agents\/login\?.*&sig=/,
		);
	});

	it("a signed query names the agent and where it returns; a tampered one is refused", async () => {
		const { cookie } = await signedIn("lia@exemplo.com");
		const claude = agent();
		const clientId = String((await claude.register()).body?.client_id);
		const authorization = await claude.authorize(
			cookie,
			clientId,
			claude.pkce().challenge,
		);
		const signedQuery = authorization.location?.split("?")[1] ?? "";
		const read = createConnectRequestReader(auth, {
			secret: "a-test-secret-with-at-least-32-characters",
			baseURL: BASE_URL,
		});
		const headers = new Headers({ cookie });

		expect(await read(signedQuery, headers)).toEqual({
			clientId,
			clientName: "Claude Code",
			redirectUri: "http://localhost:4000/callback",
		});
		expect(
			await read(signedQuery.replace("state=state-1", "state=other"), headers),
		).toBeNull();
		expect(await read("client_id=x", headers)).toBeNull();
	});

	it("registration refuses a return address a browser would read another way", async () => {
		// The browser goes to evil.example; a reader splitting at `@` sees claude.ai.
		const spoofing = agent({
			clientName: "Claude",
			redirectUri: "https://evil.example\\@claude.ai/cb",
		});

		const registered = await spoofing.register();

		expect(registered.status).toBe(400);
		expect(registered.body).toMatchObject({ error: "invalid_redirect_uri" });
	});

	it("the consent screen does not take a request whose return address a browser would read another way", async () => {
		const spoofed = "https://evil.example\\@claude.ai/cb";
		auth = build({
			agents: {
				loginPage: "/api/agents/login",
				consentPage: "/api/agents/connect",
				refreshTokenExpiresInSeconds: 90 * 24 * 60 * 60,
				fetchClientMetadataResource: async () =>
					Response.json({
						client_id: CIMD_CLIENT,
						client_name: "Claude",
						redirect_uris: [spoofed],
						token_endpoint_auth_method: "none",
						grant_types: ["authorization_code", "refresh_token"],
						response_types: ["code"],
					}),
			},
		});
		const { cookie } = await signedIn("hugo@exemplo.com");
		const spoofing = agent({ redirectUri: spoofed });
		const authorization = await spoofing.authorize(
			cookie,
			CIMD_CLIENT,
			spoofing.pkce().challenge,
		);
		const read = createConnectRequestReader(auth, {
			secret: "a-test-secret-with-at-least-32-characters",
			baseURL: BASE_URL,
		});

		const request = authorization.location?.startsWith("/api/agents/connect?")
			? await read(
					authorization.location.split("?")[1] ?? "",
					new Headers({ cookie }),
				)
			: null;

		expect(request).toBeNull();
	});

	it("a client identified by a metadata document URL is accepted", async () => {
		const { cookie, userId } = await signedIn("carla@exemplo.com");
		const vscode = agent({ redirectUri: "http://127.0.0.1:33418/callback" });

		const { accessToken } = await vscode.connect(cookie, CIMD_CLIENT);

		expect(jwtClaims(accessToken)).toMatchObject({
			sub: userId,
			client_id: CIMD_CLIENT,
		});
	});

	it("a redirect_uri other than the registered one is refused and no consent is stored", async () => {
		const { cookie, userId } = await signedIn("davi@exemplo.com");
		const claude = agent();
		const clientId = String((await claude.register()).body?.client_id);

		const authorization = await claude.authorize(
			cookie,
			clientId,
			claude.pkce().challenge,
			{ redirect_uri: "https://evil.example/callback" },
		);

		expect(authorization.location).not.toMatch(/^\/connect/);
		expect(authorization.location).not.toContain("evil.example");
		expect(
			(await testDb.db.select().from(oauthConsent)).filter(
				(row) => row.userId === userId,
			),
		).toEqual([]);
	});

	it("denying consent returns access_denied to the client", async () => {
		const { cookie } = await signedIn("eva@exemplo.com");
		const claude = agent();
		const clientId = String((await claude.register()).body?.client_id);
		const authorization = await claude.authorize(
			cookie,
			clientId,
			claude.pkce().challenge,
		);

		const callback = await claude.consent(
			cookie,
			authorization.location?.split("?")[1] ?? "",
			false,
		);

		expect(callback.searchParams.get("error")).toBe("access_denied");
		expect(callback.searchParams.get("code")).toBeNull();
	});

	it("a connection survives signing out in the browser", async () => {
		const { cookie } = await signedIn("fabio@exemplo.com");
		const claude = agent();
		const { clientId, refreshToken } = await claude.connect(cookie);

		await claude.call("/api/auth/sign-out", {
			method: "POST",
			headers: { "content-type": "application/json", cookie },
			body: "{}",
		});
		const refreshed = await claude.refresh(clientId, refreshToken);

		expect(refreshed.status).toBe(200);
		expect(refreshed.body?.access_token).toEqual(expect.any(String));
	});

	it("registration is rate limited per IP", async () => {
		const sameAddress = agent();
		const statuses: number[] = [];
		for (let index = 0; index < 11; index++) {
			statuses.push((await sameAddress.register()).status);
		}

		expect(statuses.slice(0, 10).every((status) => status === 201)).toBe(true);
		expect(statuses[10]).toBe(429);
	});

	it("sign-up stays closed on the flow's login when the instance closes it", async () => {
		const closed = build({ signUpEnabled: false });

		const response = await closed.handler(
			new Request(`${BASE_URL}/api/auth/sign-up/email`, {
				method: "POST",
				headers: {
					"content-type": "application/json",
					origin: BASE_URL,
					"x-forwarded-for": uniqueIp(),
				},
				body: JSON.stringify({
					name: "Gil",
					email: "gil@exemplo.com",
					password: "12345678",
				}),
			}),
		);

		expect(response.ok).toBe(false);
		expect(await testDb.db.select().from(user)).not.toContainEqual(
			expect.objectContaining({ email: "gil@exemplo.com" }),
		);
	});
});
