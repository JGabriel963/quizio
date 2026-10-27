import { user } from "@quizio/db/schema/auth";
import {
	createTestDb,
	type TestDatabase,
} from "@quizio/db/testing/create-test-db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createBetterAuthAccountCredentials } from "./account-credentials";
import { createAuth } from "./create-auth";

const BASE_URL = "http://localhost:3001";

describe("Better Auth account credentials (spec 039; ADR 0019)", () => {
	let testDb: TestDatabase;
	let auth: ReturnType<typeof createAuth>;

	beforeAll(async () => {
		testDb = await createTestDb();
		auth = createAuth({
			db: testDb.db,
			baseURL: BASE_URL,
			secret: "test-secret-with-more-than-32-characters",
			signUpEnabled: true,
		});
		await auth.api.signUpEmail({
			body: { name: "Ana", email: "ana@exemplo.com", password: "12345678" },
		});
		// A Google-only account: a user without a credential account.
		await testDb.db
			.insert(user)
			.values({ id: "google-bia", name: "Bia", email: "bia@gmail.test" });
	});

	afterAll(() => testDb.close());

	const anaId = async () => {
		const [row] = await testDb.db.select().from(user);
		return row?.email === "ana@exemplo.com" ? row.id : "";
	};

	it("hasPassword is false for a Google-only user", async () => {
		const credentials = createBetterAuthAccountCredentials(auth);

		expect(await credentials.hasPassword(await anaId())).toBe(true);
		expect(await credentials.hasPassword("google-bia")).toBe(false);
	});

	it("verifyPassword checks the credential account's hash", async () => {
		const credentials = createBetterAuthAccountCredentials(auth);
		const id = await anaId();

		expect(await credentials.verifyPassword(id, "12345678")).toBe(true);
		expect(await credentials.verifyPassword(id, "errada123")).toBe(false);
		expect(await credentials.verifyPassword("google-bia", "12345678")).toBe(
			false,
		);
	});
});
