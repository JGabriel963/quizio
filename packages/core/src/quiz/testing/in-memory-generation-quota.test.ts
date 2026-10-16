import { describe, expect, it } from "vitest";

import { InMemoryGenerationQuota } from "./in-memory-generation-quota";

const DAY = 24 * 60 * 60 * 1000;
const at = (iso: string) => new Date(iso);

describe("InMemoryGenerationQuota", () => {
	it("reserves up to the limit in a rolling window", async () => {
		const quota = new InMemoryGenerationQuota();
		const now = at("2026-10-16T10:00:00Z");

		expect((await quota.reserve("user-1", 2, DAY, now)).reserved).toBe(true);
		expect((await quota.reserve("user-1", 2, DAY, now)).reserved).toBe(true);
		expect(await quota.reserve("user-1", 2, DAY, now)).toEqual({
			reserved: false,
			nextAvailableAt: at("2026-10-17T10:00:00Z"),
		});
	});

	it("frees a use 24 hours after it was taken", async () => {
		const quota = new InMemoryGenerationQuota();
		await quota.reserve("user-1", 1, DAY, at("2026-10-15T09:10:00Z"));

		expect(
			(await quota.reserve("user-1", 1, DAY, at("2026-10-16T09:09:59Z")))
				.reserved,
		).toBe(false);
		expect(
			(await quota.reserve("user-1", 1, DAY, at("2026-10-16T09:10:00Z")))
				.reserved,
		).toBe(true);
	});

	it("tells when the next use frees up", async () => {
		const quota = new InMemoryGenerationQuota();
		await quota.reserve("user-1", 5, DAY, at("2026-10-15T09:10:00Z"));
		await quota.reserve("user-1", 5, DAY, at("2026-10-15T11:00:00Z"));

		expect(
			await quota.usage("user-1", DAY, at("2026-10-16T08:00:00Z")),
		).toEqual({ used: 2, oldestAt: at("2026-10-15T09:10:00Z") });
		expect(
			await quota.usage("user-2", DAY, at("2026-10-16T08:00:00Z")),
		).toEqual({ used: 0, oldestAt: null });
	});

	it("a released use does not count", async () => {
		const quota = new InMemoryGenerationQuota();
		const now = at("2026-10-16T10:00:00Z");
		const reservation = await quota.reserve("user-1", 1, DAY, now);
		if (!reservation.reserved) {
			throw new Error("expected a reservation");
		}

		await quota.release(reservation.id);

		expect((await quota.reserve("user-1", 1, DAY, now)).reserved).toBe(true);
	});
});
