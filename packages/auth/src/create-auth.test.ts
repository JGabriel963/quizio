import { user } from "@quizio/db/schema/auth";
import {
	createTestDb,
	type TestDatabase,
} from "@quizio/db/testing/create-test-db";
import type { GoogleProfile } from "better-auth/social-providers";
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

import { type CreateAuthOptions, createAuth } from "./create-auth";

const BASE_URL = "http://localhost:3001";

interface AuthResponse {
	status: number;
	body: {
		code?: string;
		message?: string;
		user?: { id?: string; name?: string; email?: string };
	} | null;
	headers: Headers;
}

let nextClientIp = 1;
/** Rate limits are per IP, so every client gets its own address. */
const uniqueIp = () => `198.51.100.${nextClientIp++}`;

/** Drives the real Better Auth HTTP handler, so hooks and rate limiting take part. */
function httpClient(auth: ReturnType<typeof createAuth>, ip = uniqueIp()) {
	const post = async (path: string, body: unknown): Promise<AuthResponse> => {
		const response = await auth.handler(
			new Request(`${BASE_URL}/api/auth${path}`, {
				method: "POST",
				headers: {
					"content-type": "application/json",
					origin: BASE_URL,
					"x-forwarded-for": ip,
				},
				body: JSON.stringify(body),
			}),
		);
		const text = await response.text();
		return {
			status: response.status,
			body: text ? JSON.parse(text) : null,
			headers: response.headers,
		};
	};

	return {
		signUp: (body: { name: string; email: string; password: string }) =>
			post("/sign-up/email", body),
		signIn: (body: { email: string; password: string }) =>
			post("/sign-in/email", body),
		/** ID-token sign-in: exercises the same account creation and linking as the redirect flow. */
		signInWithGoogle: () =>
			post("/sign-in/social", {
				provider: "google",
				idToken: { token: "fake-google-id-token" },
			}),
	};
}

const ana = { name: "Ana", email: "ana@exemplo.com", password: "12345678" };

describe("createAuth", () => {
	let testDb: TestDatabase;
	let client: ReturnType<typeof httpClient>;

	const options = (
		overrides: Partial<CreateAuthOptions> = {},
	): CreateAuthOptions => ({
		db: testDb.db,
		baseURL: BASE_URL,
		secret: "test-secret-with-more-than-32-characters",
		signUpEnabled: true,
		...overrides,
	});

	const users = () => testDb.db.select().from(user);

	beforeAll(async () => {
		testDb = await createTestDb();
	});

	afterAll(() => testDb.close());

	beforeEach(async () => {
		await testDb.db.delete(user);
		client = httpClient(createAuth(options()));
	});

	describe("email and password", () => {
		it("creates the account and a session on email sign-up", async () => {
			const response = await client.signUp(ana);

			expect(response.status).toBe(200);
			expect(response.body?.user).toMatchObject({
				name: "Ana",
				email: "ana@exemplo.com",
			});
			expect(response.headers.get("set-cookie")).toContain("session_token");
		});

		it("rejects sign-up with an existing email regardless of case and surrounding spaces", async () => {
			await client.signUp(ana);

			const response = await client.signUp({
				name: "Outra Ana",
				email: "  Ana@Exemplo.com ",
				password: "87654321",
			});

			expect(response.status).toBeGreaterThanOrEqual(400);
			expect(response.body?.code).toMatch(/^USER_ALREADY_EXISTS/);
			expect(await users()).toHaveLength(1);
		});

		it.each([
			["a 1-character name", { name: "A" }, "INVALID_NAME"],
			["a 51-character name", { name: "a".repeat(51) }, "INVALID_NAME"],
			["a 7-character password", { password: "1234567" }, "PASSWORD_TOO_SHORT"],
			[
				"a 129-character password",
				{ password: "a".repeat(129) },
				"PASSWORD_TOO_LONG",
			],
		])("rejects sign-up with %s", async (_, fields, code) => {
			const response = await client.signUp({ ...ana, ...fields });

			expect(response.status).toBe(400);
			expect(response.body?.code).toBe(code);
			expect(await users()).toHaveLength(0);
		});

		it("accepts names of 2 and 50 characters and passwords of 8 and 128", async () => {
			const shortest = await client.signUp({
				name: "Al",
				email: "al@exemplo.com",
				password: "a".repeat(8),
			});
			const longest = await client.signUp({
				name: "a".repeat(50),
				email: "longo@exemplo.com",
				password: "a".repeat(128),
			});

			expect([shortest.status, longest.status]).toEqual([200, 200]);
		});

		it("stores the name without surrounding spaces", async () => {
			const response = await client.signUp({ ...ana, name: "  Ana Souza  " });

			expect(response.body?.user).toMatchObject({ name: "Ana Souza" });
		});

		it("signs in with correct credentials", async () => {
			await client.signUp(ana);

			const response = await client.signIn({
				email: " ANA@exemplo.com",
				password: ana.password,
			});

			expect(response.status).toBe(200);
			expect(response.headers.get("set-cookie")).toContain("session_token");
		});

		it("returns the same error for an unknown email and a wrong password", async () => {
			await client.signUp(ana);

			const wrongPassword = await client.signIn({
				email: ana.email,
				password: "senha-errada",
			});
			const unknownEmail = await client.signIn({
				email: "ninguem@exemplo.com",
				password: ana.password,
			});

			expect(wrongPassword.status).toBe(unknownEmail.status);
			expect(wrongPassword.body).toEqual(unknownEmail.body);
			expect(wrongPassword.body?.code).toBe("INVALID_EMAIL_OR_PASSWORD");
		});
	});

	describe("rate limiting", () => {
		afterEach(() => {
			vi.useRealTimers();
		});

		it("blocks sign-in after 5 failed attempts and allows it again after the window", async () => {
			vi.useFakeTimers({ toFake: ["Date"] });
			await client.signUp(ana);
			for (let attempt = 1; attempt <= 5; attempt++) {
				const failed = await client.signIn({
					email: ana.email,
					password: "senha-errada",
				});
				expect(failed.status).toBe(401);
			}

			const blocked = await client.signIn(ana);
			vi.setSystemTime(Date.now() + 61_000);
			const afterWindow = await client.signIn(ana);

			expect(blocked.status).toBe(429);
			expect(afterWindow.status).toBe(200);
		});
	});

	describe("Google", () => {
		/** Claims of a verified Google ID token; `sub` identifies the Google account. */
		const googleProfile = {
			sub: "google-ana",
			email: "ana@exemplo.com",
			email_verified: true,
			name: "Ana Google",
			given_name: "Ana",
			family_name: "Google",
			picture: "https://example.com/ana.png",
			iss: "https://accounts.google.com",
			aud: "test-client-id",
			azp: "test-client-id",
			iat: 1_780_000_000,
			exp: 1_780_003_600,
		} as GoogleProfile;

		/** Google is configured with a fake token check, as the real flow would verify it with Google. */
		const googleClient = (overrides: Partial<CreateAuthOptions> = {}) =>
			httpClient(
				createAuth(
					options({
						google: {
							clientId: "test-client-id",
							clientSecret: "test-client-secret",
							verifyIdToken: async () => true,
							getUserInfo: async () => ({
								user: {
									email: googleProfile.email,
									name: googleProfile.name,
									image: googleProfile.picture,
									emailVerified: googleProfile.email_verified,
								},
								data: googleProfile,
							}),
						},
						...overrides,
					}),
				),
			);

		it("creates an account on first Google sign-in", async () => {
			const response = await googleClient().signInWithGoogle();

			expect(response.status).toBe(200);
			expect(response.body?.user).toMatchObject({
				name: "Ana Google",
				email: "ana@exemplo.com",
			});
			expect(await users()).toHaveLength(1);
		});

		it("links Google sign-in to the existing account with the same email", async () => {
			const google = googleClient();
			const signedUp = await google.signUp(ana);

			const response = await google.signInWithGoogle();

			expect(response.status).toBe(200);
			expect(response.body?.user?.id).toBe(signedUp.body?.user?.id);
			expect(await users()).toHaveLength(1);
		});

		it("with sign-up disabled rejects email sign-up and new Google users", async () => {
			const closed = googleClient({ signUpEnabled: false });

			const emailSignUp = await closed.signUp(ana);
			const googleSignUp = await closed.signInWithGoogle();

			expect(emailSignUp.status).toBeGreaterThanOrEqual(400);
			expect(googleSignUp.status).toBeGreaterThanOrEqual(400);
			expect(JSON.stringify(googleSignUp.body)).toMatch(/sign.?up.?disabled/i);
			expect(await users()).toHaveLength(0);
		});

		it("with sign-up disabled existing users still sign in with password and Google", async () => {
			await googleClient().signUp(ana);
			const closed = googleClient({ signUpEnabled: false });

			const withPassword = await closed.signIn(ana);
			const withGoogle = await closed.signInWithGoogle();

			expect([withPassword.status, withGoogle.status]).toEqual([200, 200]);
		});
	});
});
