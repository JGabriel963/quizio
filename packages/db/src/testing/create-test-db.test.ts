import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { session, user } from "../schema/auth";
import { createTestDb, type TestDatabase } from "./create-test-db";

describe("createTestDb", () => {
	let testDb: TestDatabase;

	beforeAll(async () => {
		testDb = await createTestDb();
	});

	afterAll(() => testDb.close());

	it("pushes the schema so rows round-trip through real Postgres", async () => {
		await testDb.db
			.insert(user)
			.values({ id: "user-1", name: "Ana", email: "ana@quizio.test" });

		const [stored] = await testDb.db
			.select()
			.from(user)
			.where(eq(user.id, "user-1"));

		expect(stored).toMatchObject({ name: "Ana", emailVerified: false });
	});

	it("enforces constraints declared in the schema", async () => {
		await expect(
			testDb.db.insert(session).values({
				id: "session-1",
				token: "token",
				userId: "missing-user",
				expiresAt: new Date(),
				updatedAt: new Date(),
			}),
		).rejects.toThrow();
	});
});
