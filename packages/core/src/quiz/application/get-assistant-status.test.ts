import { describe, expect, it } from "vitest";

import { FixedClock } from "../../shared/testing/fixed-clock";
import {
	DEFAULT_GENERATION_OPTIONS,
	GENERATION_QUOTA_WINDOW_MS,
} from "../domain/generation";
import {
	type CreditPricing,
	DEFAULT_CREDIT_PRICING,
} from "../domain/generation-credits";
import { InMemoryAssistantPreferencesRepository } from "../testing/in-memory-assistant-preferences-repository";
import { InMemoryGenerationQuota } from "../testing/in-memory-generation-quota";
import { InMemoryQuestionGenerator } from "../testing/in-memory-question-generator";
import { createGetAssistantStatus } from "./get-assistant-status";

function setup({
	enabled = true,
	creditsPerDay = 3,
	pricing = DEFAULT_CREDIT_PRICING,
}: {
	enabled?: boolean;
	creditsPerDay?: number;
	pricing?: CreditPricing;
} = {}) {
	const deps = {
		questionGenerator: enabled ? new InMemoryQuestionGenerator() : null,
		generationQuota: new InMemoryGenerationQuota(),
		assistantPreferences: new InMemoryAssistantPreferencesRepository(),
		assistantSettings: {
			creditsPerDay,
			instanceCreditsPerDay: 1000,
			pricing,
		},
		clock: new FixedClock("2026-10-16T10:00:00.000Z"),
	};
	return { ...deps, getStatus: createGetAssistantStatus(deps) };
}

describe("getAssistantStatus", () => {
	it("is disabled without a generator", async () => {
		const { getStatus } = setup({ enabled: false });

		expect((await getStatus({ ownerId: "user-1" })).enabled).toBe(false);
	});

	it("returns the defaults until the creator generates once", async () => {
		const { getStatus } = setup();

		expect(await getStatus({ ownerId: "user-1" })).toEqual({
			enabled: true,
			limit: 3,
			used: 0,
			remaining: 3,
			nextAvailableAt: null,
			nextFreeInMs: null,
			options: DEFAULT_GENERATION_OPTIONS,
			pricing: DEFAULT_CREDIT_PRICING,
		});
	});

	it("tells the budget, the credits used and what is left (spec 045, RN-16)", async () => {
		const { getStatus, generationQuota, clock } = setup({ creditsPerDay: 20 });
		const reservation = await generationQuota.reserve(
			"user-1",
			6,
			{ perOwner: 20, instance: 1000 },
			GENERATION_QUOTA_WINDOW_MS,
			clock.now(),
		);
		if (reservation.reserved) {
			await generationQuota.settle(reservation.id, { charged: 4, spent: 4 });
		}

		expect(await getStatus({ ownerId: "user-1" })).toMatchObject({
			limit: 20,
			used: 4,
			remaining: 16,
		});
	});

	it("carries the instance's weights, for the screen's estimate (spec 045, RN-06)", async () => {
		const pricing = { inputPer1kTokens: 0.3, outputPer1kTokens: 1.2 };
		const { getStatus } = setup({ pricing });

		expect((await getStatus({ ownerId: "user-1" })).pricing).toEqual(pricing);
	});

	it("returns the remembered options", async () => {
		const { getStatus, assistantPreferences } = setup();
		const options = {
			format: "mixed",
			language: "en",
			level: "advanced",
			count: 10,
		} as const;
		await assistantPreferences.save("user-1", options);

		expect((await getStatus({ ownerId: "user-1" })).options).toEqual(options);
	});

	it("tells the remaining uses and when the next one frees up", async () => {
		const { getStatus, generationQuota, clock } = setup({
			creditsPerDay: 2,
		});
		await generationQuota.reserve(
			"user-1",
			1,
			{ perOwner: 2, instance: 1000 },
			GENERATION_QUOTA_WINDOW_MS,
			new Date("2026-10-15T12:30:00.000Z"),
		);

		expect(await getStatus({ ownerId: "user-1" })).toMatchObject({
			remaining: 1,
			nextAvailableAt: null,
		});

		await generationQuota.reserve(
			"user-1",
			1,
			{ perOwner: 2, instance: 1000 },
			GENERATION_QUOTA_WINDOW_MS,
			clock.now(),
		);

		expect(await getStatus({ ownerId: "user-1" })).toMatchObject({
			remaining: 0,
			nextAvailableAt: new Date("2026-10-16T12:30:00.000Z"),
		});
	});

	it("tells how many were used and when the oldest leaves the window (spec 039, RN-17)", async () => {
		const { getStatus, generationQuota } = setup({ creditsPerDay: 20 });
		for (const at of ["2026-10-15T15:00:00.000Z", "2026-10-16T08:00:00.000Z"]) {
			await generationQuota.reserve(
				"user-1",
				1,
				{ perOwner: 20, instance: 1000 },
				GENERATION_QUOTA_WINDOW_MS,
				new Date(at),
			);
		}

		expect(await getStatus({ ownerId: "user-1" })).toMatchObject({
			used: 2,
			remaining: 18,
			nextAvailableAt: null,
			nextFreeInMs: 5 * 60 * 60 * 1000,
		});
	});
});
