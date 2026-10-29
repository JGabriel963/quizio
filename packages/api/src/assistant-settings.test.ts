import { DEFAULT_CREDIT_PRICING } from "@quizio/core/quiz/domain/generation-credits";
import { describe, expect, it } from "vitest";

import { assistantSettingsOf } from "./assistant-settings";

/** The variables as t3-env gives them when only the old ones have defaults. */
const withDefaults = {
	AI_GENERATIONS_PER_DAY: 20,
	AI_INSTANCE_GENERATIONS_PER_DAY: 200,
};

describe("assistantSettingsOf (spec 045)", () => {
	it("reads the credits per day and the instance's ceiling", () => {
		expect(
			assistantSettingsOf({
				...withDefaults,
				AI_CREDITS_PER_DAY: 30,
				AI_INSTANCE_CREDITS_PER_DAY: 500,
			}),
		).toMatchObject({ creditsPerDay: 30, instanceCreditsPerDay: 500 });
	});

	it("falls back to AI_GENERATIONS_PER_DAY and AI_INSTANCE_GENERATIONS_PER_DAY", () => {
		expect(
			assistantSettingsOf({
				AI_GENERATIONS_PER_DAY: 12,
				AI_INSTANCE_GENERATIONS_PER_DAY: 90,
			}),
		).toMatchObject({ creditsPerDay: 12, instanceCreditsPerDay: 90 });
	});

	it("uses the default weights when none are set", () => {
		expect(assistantSettingsOf(withDefaults).pricing).toEqual(
			DEFAULT_CREDIT_PRICING,
		);
	});

	it("reads the weights the instance set", () => {
		expect(
			assistantSettingsOf({
				...withDefaults,
				AI_CREDITS_PER_1K_INPUT_TOKENS: 0.3,
				AI_CREDITS_PER_1K_OUTPUT_TOKENS: 1.2,
			}).pricing,
		).toEqual({ inputPer1kTokens: 0.3, outputPer1kTokens: 1.2 });
	});
});
