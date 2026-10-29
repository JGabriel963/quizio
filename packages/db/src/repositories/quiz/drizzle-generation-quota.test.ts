import type { QuotaReservation } from "@quizio/core/quiz/application/ports/generation-quota";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { user } from "../../schema/auth";
import { generationUsage } from "../../schema/quiz";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleGenerationQuota } from "./drizzle-generation-quota";

const DAY = 24 * 60 * 60 * 1000;
const at = (iso: string) => new Date(iso);
const limits = (perOwner: number, instance = 1000) => ({ perOwner, instance });

function idOf(reservation: QuotaReservation): string {
	if (!reservation.reserved) {
		throw new Error("expected a reservation");
	}
	return reservation.id;
}

describe("DrizzleGenerationQuota (spec 045)", () => {
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

	it("sums credits, not rows", async () => {
		const quota = createDrizzleGenerationQuota(testDb.db);
		const now = at("2026-10-16T10:00:00Z");

		expect(
			(await quota.reserve("user-1", 3, limits(5), DAY, now)).reserved,
		).toBe(true);
		expect(
			(await quota.reserve("user-1", 2, limits(5), DAY, now)).reserved,
		).toBe(true);
		expect(await quota.reserve("user-1", 1, limits(5), DAY, now)).toEqual({
			reserved: false,
			nextAvailableAt: at("2026-10-17T10:00:00Z"),
			limitedBy: "owner",
		});
		expect(await quota.usage("user-1", DAY, now)).toEqual({
			used: 5,
			oldestAt: now,
		});
	});

	it("refuses credits that do not fit the owner's budget", async () => {
		const quota = createDrizzleGenerationQuota(testDb.db);
		const now = at("2026-10-16T10:00:00Z");
		await quota.reserve("user-1", 4, limits(5), DAY, now);

		expect(
			(await quota.reserve("user-1", 2, limits(5), DAY, now)).reserved,
		).toBe(false);
		expect(
			(await quota.reserve("user-1", 1, limits(5), DAY, now)).reserved,
		).toBe(true);
	});

	it("refuses credits that do not fit the instance's ceiling, counting every owner", async () => {
		const quota = createDrizzleGenerationQuota(testDb.db);
		const now = at("2026-10-16T10:00:00Z");
		await quota.reserve(
			"user-1",
			3,
			limits(10, 5),
			DAY,
			at("2026-10-16T08:00:00Z"),
		);
		await quota.reserve("user-2", 1, limits(10, 5), DAY, now);

		expect(await quota.reserve("user-1", 2, limits(10, 5), DAY, now)).toEqual({
			reserved: false,
			nextAvailableAt: at("2026-10-17T08:00:00Z"),
			limitedBy: "instance",
		});
	});

	it("settle writes what the creator was charged and what the instance spent", async () => {
		const quota = createDrizzleGenerationQuota(testDb.db);
		const now = at("2026-10-16T10:00:00Z");
		const id = idOf(await quota.reserve("user-1", 4, limits(10, 10), DAY, now));

		await quota.settle(id, { charged: 1, spent: 6 });

		expect((await quota.usage("user-1", DAY, now)).used).toBe(1);
		expect(
			(await quota.reserve("user-2", 5, limits(10, 10), DAY, now)).reserved,
		).toBe(false);
		expect(
			(await quota.reserve("user-2", 4, limits(10, 10), DAY, now)).reserved,
		).toBe(true);
	});

	it("the credits of a creation return 24 hours after it", async () => {
		const quota = createDrizzleGenerationQuota(testDb.db);
		await quota.reserve(
			"user-1",
			5,
			limits(5),
			DAY,
			at("2026-10-15T09:10:00Z"),
		);

		expect(
			(
				await quota.reserve(
					"user-1",
					1,
					limits(5),
					DAY,
					at("2026-10-16T09:09:59Z"),
				)
			).reserved,
		).toBe(false);
		expect(
			(
				await quota.reserve(
					"user-1",
					1,
					limits(5),
					DAY,
					at("2026-10-16T09:10:00Z"),
				)
			).reserved,
		).toBe(true);
	});

	it("a released use does not count", async () => {
		const quota = createDrizzleGenerationQuota(testDb.db);
		const now = at("2026-10-16T10:00:00Z");
		const id = idOf(await quota.reserve("user-1", 5, limits(5), DAY, now));

		await quota.release(id);

		expect(await quota.usage("user-1", DAY, now)).toEqual({
			used: 0,
			oldestAt: null,
		});
		expect(
			(await quota.reserve("user-1", 5, limits(5), DAY, now)).reserved,
		).toBe(true);
	});

	it("two reservations of one owner at the same time never pass the budget", async () => {
		const quota = createDrizzleGenerationQuota(testDb.db);
		const now = at("2026-10-16T10:00:00Z");

		const results = await Promise.all([
			quota.reserve("user-1", 4, limits(5), DAY, now),
			quota.reserve("user-1", 4, limits(5), DAY, now),
		]);

		expect(results.filter((result) => result.reserved)).toHaveLength(1);
		expect((await quota.usage("user-1", DAY, now)).used).toBe(4);
	});

	it("the instance's ceiling holds under concurrent calls of different owners", async () => {
		const quota = createDrizzleGenerationQuota(testDb.db);
		const now = at("2026-10-16T10:00:00Z");

		const results = await Promise.all([
			quota.reserve("user-1", 3, limits(10, 5), DAY, now),
			quota.reserve("user-2", 3, limits(10, 5), DAY, now),
		]);

		expect(results.filter((result) => result.reserved)).toHaveLength(1);
	});

	it("a row stored before the change counts as 1 credit", async () => {
		const quota = createDrizzleGenerationQuota(testDb.db);
		const now = at("2026-10-16T10:00:00Z");
		await testDb.db
			.insert(generationUsage)
			.values({ id: "before", ownerId: "user-1", createdAt: now });

		expect((await quota.usage("user-1", DAY, now)).used).toBe(1);
	});

	it("a deleted account's credits still count for the instance, with no link to it", async () => {
		const quota = createDrizzleGenerationQuota(testDb.db);
		const now = at("2026-10-16T10:00:00Z");
		await testDb.db
			.insert(user)
			.values({ id: "user-3", name: "Caio", email: "caio@quizio.test" });
		await quota.reserve("user-3", 3, limits(5, 3), DAY, now);

		await testDb.db.delete(user).where(eq(user.id, "user-3"));

		expect(
			await quota.reserve("user-1", 1, limits(5, 3), DAY, now),
		).toMatchObject({ reserved: false, limitedBy: "instance" });
		expect(
			(await testDb.db.select().from(generationUsage)).map(
				(row) => row.ownerId,
			),
		).toEqual([null]);
	});

	it("keeps owners apart", async () => {
		const quota = createDrizzleGenerationQuota(testDb.db);
		const now = at("2026-10-16T10:00:00Z");
		await quota.reserve("user-1", 5, limits(5), DAY, now);

		expect(
			(await quota.reserve("user-2", 5, limits(5), DAY, now)).reserved,
		).toBe(true);
	});
});
