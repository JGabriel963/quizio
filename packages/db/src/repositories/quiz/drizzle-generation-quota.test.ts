import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { user } from "../../schema/auth";
import { generationUsage } from "../../schema/quiz";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleGenerationQuota } from "./drizzle-generation-quota";

const DAY = 24 * 60 * 60 * 1000;
const at = (iso: string) => new Date(iso);

describe("DrizzleGenerationQuota", () => {
	let testDb: TestDatabase;

	beforeAll(async () => {
		testDb = await createTestDb();
		await testDb.db.insert(user).values([
			{ id: "user-1", name: "Ana", email: "ana@quizio.test" },
			{ id: "user-2", name: "Bia", email: "bia@quizio.test" },
		]);
	});

	afterAll(() => testDb.close());

	beforeEach(async () => {
		await testDb.db.delete(generationUsage);
	});

	it("reserves up to the limit in a rolling window", async () => {
		const quota = createDrizzleGenerationQuota(testDb.db);
		const now = at("2026-10-16T10:00:00Z");

		expect((await quota.reserve("user-1", 2, DAY, now)).reserved).toBe(true);
		expect((await quota.reserve("user-1", 2, DAY, now)).reserved).toBe(true);
		expect((await quota.reserve("user-1", 2, DAY, now)).reserved).toBe(false);
	});

	it("tells when the next use frees up", async () => {
		const quota = createDrizzleGenerationQuota(testDb.db);
		await quota.reserve("user-1", 2, DAY, at("2026-10-15T09:10:00Z"));
		await quota.reserve("user-1", 2, DAY, at("2026-10-15T11:00:00Z"));

		expect(
			await quota.reserve("user-1", 2, DAY, at("2026-10-16T09:00:00Z")),
		).toEqual({
			reserved: false,
			nextAvailableAt: at("2026-10-16T09:10:00Z"),
		});
		expect(
			await quota.usage("user-1", DAY, at("2026-10-16T09:00:00Z")),
		).toEqual({
			used: 2,
			oldestAt: at("2026-10-15T09:10:00Z"),
		});
		expect(
			(await quota.reserve("user-1", 2, DAY, at("2026-10-16T09:10:00Z")))
				.reserved,
		).toBe(true);
	});

	it("a released use does not count", async () => {
		const quota = createDrizzleGenerationQuota(testDb.db);
		const now = at("2026-10-16T10:00:00Z");
		const reservation = await quota.reserve("user-1", 1, DAY, now);
		if (!reservation.reserved) {
			throw new Error("expected a reservation");
		}

		await quota.release(reservation.id);

		expect(await quota.usage("user-1", DAY, now)).toEqual({
			used: 0,
			oldestAt: null,
		});
		expect((await quota.reserve("user-1", 1, DAY, now)).reserved).toBe(true);
	});

	it("reserve is atomic under two concurrent calls", async () => {
		const quota = createDrizzleGenerationQuota(testDb.db);
		const now = at("2026-10-16T10:00:00Z");

		const results = await Promise.all([
			quota.reserve("user-1", 1, DAY, now),
			quota.reserve("user-1", 1, DAY, now),
		]);

		expect(results.filter((result) => result.reserved)).toHaveLength(1);
		expect((await quota.usage("user-1", DAY, now)).used).toBe(1);
	});

	it("keeps owners apart", async () => {
		const quota = createDrizzleGenerationQuota(testDb.db);
		const now = at("2026-10-16T10:00:00Z");
		await quota.reserve("user-1", 1, DAY, now);

		expect((await quota.reserve("user-2", 1, DAY, now)).reserved).toBe(true);
	});
});
