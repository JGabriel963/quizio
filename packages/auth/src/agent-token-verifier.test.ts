import {
	createTestDb,
	type TestDatabase,
} from "@quizio/db/testing/create-test-db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
	createBetterAuthAgentTokenVerifier,
	jwksFromHandler,
} from "./agent-token-verifier";
import { createAuth } from "./create-auth";
import { oauthTestAgent } from "./testing/oauth-test-agent";

const BASE_URL = "http://localhost:3001";
const HOUR_MS = 60 * 60 * 1000;

describe("createBetterAuthAgentTokenVerifier (spec 044, RN-02)", () => {
	let testDb: TestDatabase;
	let auth: ReturnType<typeof createAuth>;
	let connected: { clientId: string; accessToken: string; userId: string };

	beforeAll(async () => {
		testDb = await createTestDb();
		auth = createAuth({
			db: testDb.db,
			baseURL: BASE_URL,
			secret: "a-test-secret-with-at-least-32-characters",
			signUpEnabled: true,
			agents: {
				loginPage: "/login",
				consentPage: "/connect",
				refreshTokenExpiresInSeconds: 90 * 24 * 60 * 60,
			},
		});
		const signUp = await auth.handler(
			new Request(`${BASE_URL}/api/auth/sign-up/email`, {
				method: "POST",
				headers: {
					"content-type": "application/json",
					origin: BASE_URL,
					"x-forwarded-for": "203.0.113.90",
				},
				body: JSON.stringify({
					name: "Ana",
					email: "ana@exemplo.com",
					password: "12345678",
				}),
			}),
		);
		const { user } = (await signUp.json()) as { user: { id: string } };
		const cookie = signUp.headers
			.getSetCookie()
			.map((each) => each.split(";")[0])
			.join("; ");
		const agent = oauthTestAgent({
			handler: (request) => auth.handler(request),
			baseURL: BASE_URL,
			ip: "203.0.113.91",
		});
		connected = { ...(await agent.connect(cookie)), userId: user.id };
	});

	afterAll(() => testDb.close());

	const verifier = (
		overrides: Partial<
			Parameters<typeof createBetterAuthAgentTokenVerifier>[0]
		> = {},
	) =>
		createBetterAuthAgentTokenVerifier({
			fetchJwks: jwksFromHandler(auth, BASE_URL),
			issuer: `${BASE_URL}/api/auth`,
			audience: `${BASE_URL}/mcp`,
			...overrides,
		});

	it("a token issued for /mcp verifies with the user and the client", async () => {
		expect(await verifier().verify(connected.accessToken)).toEqual({
			userId: connected.userId,
			clientId: connected.clientId,
		});
	});

	it("a token for another audience, an expired one and garbage give null", async () => {
		expect(
			await verifier({ audience: `${BASE_URL}/other` }).verify(
				connected.accessToken,
			),
		).toBeNull();
		expect(
			await verifier({ now: () => new Date(Date.now() + 2 * HOUR_MS) }).verify(
				connected.accessToken,
			),
		).toBeNull();
		expect(await verifier().verify("garbage")).toBeNull();
		expect(await verifier().verify("a.b.c")).toBeNull();
	});

	it("keys are read in process and cached", async () => {
		let fetched = 0;
		const read = jwksFromHandler(auth, BASE_URL);
		const cached = verifier({
			fetchJwks: async () => {
				fetched += 1;
				return read();
			},
		});

		await cached.verify(connected.accessToken);
		await cached.verify(connected.accessToken);

		expect(fetched).toBe(1);
	});
});
