import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleAttemptLimiter } from "./drizzle-attempt-limiter";

const MINUTE = 60_000;
const now = new Date("2026-06-01T12:00:10.000Z");

describe("DrizzleAttemptLimiter", () => {
	let testDb: TestDatabase;

	beforeAll(async () => {
		testDb = await createTestDb();
	});

	afterAll(() => testDb.close());

	it("takes attempts up to the limit of the window", async () => {
		const limiter = createDrizzleAttemptLimiter(testDb.db);

		expect(await limiter.reserve("pin:a", MINUTE, 2, now)).toBe(true);
		expect(
			await limiter.reserve(
				"pin:a",
				MINUTE,
				2,
				new Date(now.getTime() + 20_000),
			),
		).toBe(true);
		expect(await limiter.reserve("pin:a", MINUTE, 2, now)).toBe(false);
		// Another key has its own count.
		expect(await limiter.reserve("pin:b", MINUTE, 2, now)).toBe(true);
	});

	it("starts over in the next window", async () => {
		const limiter = createDrizzleAttemptLimiter(testDb.db);
		const next = new Date(now.getTime() + MINUTE);
		await limiter.reserve("pin:c", MINUTE, 1, now);

		expect(await limiter.reserve("pin:c", MINUTE, 1, now)).toBe(false);
		expect(await limiter.reserve("pin:c", MINUTE, 1, next)).toBe(true);
		expect(await limiter.reserve("pin:c", MINUTE, 1, next)).toBe(false);
	});

	it("an attempt given back makes room again", async () => {
		const limiter = createDrizzleAttemptLimiter(testDb.db);
		await limiter.reserve("pin:d", MINUTE, 1, now);

		await limiter.release("pin:d", MINUTE, now);

		expect(await limiter.reserve("pin:d", MINUTE, 1, now)).toBe(true);
	});

	it("giving back never goes below zero, nor reaches another window", async () => {
		const limiter = createDrizzleAttemptLimiter(testDb.db);
		const next = new Date(now.getTime() + MINUTE);

		await limiter.release("pin:e", MINUTE, now);
		await limiter.reserve("pin:e", MINUTE, 1, now);
		await limiter.release("pin:e", MINUTE, now);
		await limiter.release("pin:e", MINUTE, now);
		expect(await limiter.reserve("pin:e", MINUTE, 1, now)).toBe(true);

		// The attempt of this window is not given back by a later one.
		await limiter.release("pin:e", MINUTE, next);
		expect(await limiter.reserve("pin:e", MINUTE, 1, now)).toBe(false);
	});

	it("attempts at the same time take no more than the limit", async () => {
		const limiter = createDrizzleAttemptLimiter(testDb.db);

		const taken = await Promise.all(
			Array.from({ length: 12 }, () =>
				limiter.reserve("pin:f", MINUTE, 5, now),
			),
		);

		expect(taken.filter(Boolean)).toHaveLength(5);
	});
});
