import { describe, expect, it } from "vitest";

import { InMemoryGenerationQuota } from "./in-memory-generation-quota";

const DAY = 24 * 60 * 60 * 1000;
const at = (iso: string) => new Date(iso);
const limits = (perOwner: number, instance = 1000) => ({ perOwner, instance });

async function reserved(
	quota: InMemoryGenerationQuota,
	...args: Parameters<InMemoryGenerationQuota["reserve"]>
): Promise<string> {
	const reservation = await quota.reserve(...args);
	if (!reservation.reserved) {
		throw new Error("expected a reservation");
	}
	return reservation.id;
}

describe("InMemoryGenerationQuota (spec 045)", () => {
	it("sums credits, not rows", async () => {
		const quota = new InMemoryGenerationQuota();
		const now = at("2026-10-16T10:00:00Z");
		await reserved(quota, "user-1", 3, limits(5), DAY, now);
		await reserved(quota, "user-1", 2, limits(5), DAY, now);

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
		const quota = new InMemoryGenerationQuota();
		const now = at("2026-10-16T10:00:00Z");
		await reserved(quota, "user-1", 4, limits(5), DAY, now);

		expect(
			(await quota.reserve("user-1", 2, limits(5), DAY, now)).reserved,
		).toBe(false);
		expect(
			(await quota.reserve("user-1", 1, limits(5), DAY, now)).reserved,
		).toBe(true);
	});

	it("refuses credits that do not fit the instance's ceiling, counting every owner", async () => {
		const quota = new InMemoryGenerationQuota();
		const now = at("2026-10-16T10:00:00Z");
		await reserved(
			quota,
			"user-1",
			3,
			limits(10, 5),
			DAY,
			at("2026-10-16T08:00:00Z"),
		);
		await reserved(quota, "user-2", 1, limits(10, 5), DAY, now);

		expect(await quota.reserve("user-3", 2, limits(10, 5), DAY, now)).toEqual({
			reserved: false,
			nextAvailableAt: at("2026-10-17T08:00:00Z"),
			limitedBy: "instance",
		});
	});

	it("settle writes what the creator was charged and what the instance spent", async () => {
		const quota = new InMemoryGenerationQuota();
		const now = at("2026-10-16T10:00:00Z");
		const id = await reserved(quota, "user-1", 4, limits(10, 10), DAY, now);

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
		const quota = new InMemoryGenerationQuota();
		await reserved(
			quota,
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

	it("tells another owner's usage apart", async () => {
		const quota = new InMemoryGenerationQuota();
		await reserved(
			quota,
			"user-1",
			2,
			limits(5),
			DAY,
			at("2026-10-15T09:10:00Z"),
		);

		expect(
			await quota.usage("user-2", DAY, at("2026-10-16T08:00:00Z")),
		).toEqual({ used: 0, oldestAt: null });
	});

	it("a released use does not count", async () => {
		const quota = new InMemoryGenerationQuota();
		const now = at("2026-10-16T10:00:00Z");
		const id = await reserved(quota, "user-1", 5, limits(5), DAY, now);

		await quota.release(id);

		expect(
			(await quota.reserve("user-1", 5, limits(5), DAY, now)).reserved,
		).toBe(true);
	});
});
