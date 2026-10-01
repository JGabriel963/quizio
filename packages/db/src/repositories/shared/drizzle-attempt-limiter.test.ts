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

	it("counts the attempts of a key in the current window", async () => {
		const limiter = createDrizzleAttemptLimiter(testDb.db);

		expect(await limiter.count("pin:a", MINUTE, now)).toBe(0);

		await limiter.record("pin:a", MINUTE, now);
		await limiter.record("pin:a", MINUTE, new Date(now.getTime() + 20_000));
		await limiter.record("pin:b", MINUTE, now);

		expect(await limiter.count("pin:a", MINUTE, now)).toBe(2);
		expect(await limiter.count("pin:b", MINUTE, now)).toBe(1);
	});

	it("starts over in the next window", async () => {
		const limiter = createDrizzleAttemptLimiter(testDb.db);
		const next = new Date(now.getTime() + MINUTE);
		await limiter.record("pin:c", MINUTE, now);
		await limiter.record("pin:c", MINUTE, now);

		expect(await limiter.count("pin:c", MINUTE, next)).toBe(0);

		await limiter.record("pin:c", MINUTE, next);

		expect(await limiter.count("pin:c", MINUTE, next)).toBe(1);
	});

	it("counts concurrent attempts", async () => {
		const limiter = createDrizzleAttemptLimiter(testDb.db);

		await Promise.all(
			Array.from({ length: 5 }, () => limiter.record("pin:d", MINUTE, now)),
		);

		expect(await limiter.count("pin:d", MINUTE, now)).toBe(5);
	});
});
