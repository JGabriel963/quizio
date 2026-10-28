import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { user } from "../../schema/auth";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleAccountRepository } from "./drizzle-account-repository";

describe("DrizzleAccountRepository", () => {
	let testDb: TestDatabase;

	beforeAll(async () => {
		testDb = await createTestDb();
		await testDb.db.insert(user).values([
			{
				id: "ana",
				name: "Ana",
				email: "ana@quizio.test",
				updatedAt: new Date("2026-01-01T00:00:00.000Z"),
			},
			{ id: "bruno", name: "Bruno", email: "bruno@quizio.test" },
		]);
	});

	afterAll(() => testDb.close());

	it("rename writes the user's name and updatedAt (spec 044, RN-19)", async () => {
		await createDrizzleAccountRepository(testDb.db).rename("ana", "Ana Souza");

		const [ana] = await testDb.db.select().from(user).where(eq(user.id, "ana"));
		const [bruno] = await testDb.db
			.select()
			.from(user)
			.where(eq(user.id, "bruno"));
		expect(ana?.name).toBe("Ana Souza");
		expect(ana?.updatedAt.getTime()).toBeGreaterThan(
			new Date("2026-01-01T00:00:00.000Z").getTime(),
		);
		expect(bruno?.name).toBe("Bruno");
	});
});
