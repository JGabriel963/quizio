import type { Clock } from "../../shared/application/ports/clock";
import {
	DEFAULT_GENERATION_OPTIONS,
	GENERATION_QUOTA_WINDOW_MS,
	type GenerationOptions,
} from "../domain/generation";
import type { CreditPricing } from "../domain/generation-credits";
import type { AssistantPreferencesRepository } from "./ports/assistant-preferences-repository";
import type { GenerationQuota } from "./ports/generation-quota";
import type { QuestionGenerator } from "./ports/question-generator";

/** The instance's credits (spec 045), all configurable. */
export interface AssistantSettings {
	/** Each creator's budget every 24 hours (RN-03): 20 by default. */
	creditsPerDay: number;
	/** Every creator's credits together, so free accounts cannot add up a bill (RN-13). */
	instanceCreditsPerDay: number;
	/** How the provider's usage becomes credits (RN-04). */
	pricing: CreditPricing;
}

export interface AssistantStatus {
	/** False when the instance has no AI provider (RN-01). */
	enabled: boolean;
	/** The creator's credits every 24 hours (spec 045, RN-03). */
	limit: number;
	/** Credits in the last 24 hours ("Acesso à IA", spec 045, RN-17). */
	used: number;
	remaining: number;
	/** With no credit left, when the oldest creation's credits come back (spec 045, RN-16). */
	nextAvailableAt: Date | null;
	/**
	 * With any credit spent in the window, how long until the oldest leaves it
	 * (spec 045, RN-17); a duration, never an instant for the device's clock.
	 */
	nextFreeInMs: number | null;
	/** The options the creator last generated with, or the defaults (RN-07). */
	options: GenerationOptions;
	/** The instance's weights, so the screen shows the same estimate the server reserves (spec 045, RN-06). */
	pricing: CreditPricing;
}

export type GetAssistantStatus = (input: {
	ownerId: string;
}) => Promise<AssistantStatus>;

export function createGetAssistantStatus(deps: {
	questionGenerator: QuestionGenerator | null;
	generationQuota: GenerationQuota;
	assistantPreferences: AssistantPreferencesRepository;
	assistantSettings: AssistantSettings;
	clock: Clock;
}): GetAssistantStatus {
	return async ({ ownerId }) => {
		const limit = deps.assistantSettings.creditsPerDay;
		const now = deps.clock.now();
		const [usage, options] = await Promise.all([
			deps.generationQuota.usage(ownerId, GENERATION_QUOTA_WINDOW_MS, now),
			deps.assistantPreferences.find(ownerId),
		]);
		const remaining = Math.max(0, limit - usage.used);
		const oldestLeavesAt = usage.oldestAt
			? usage.oldestAt.getTime() + GENERATION_QUOTA_WINDOW_MS
			: null;
		return {
			enabled: deps.questionGenerator !== null,
			limit,
			used: usage.used,
			remaining,
			nextAvailableAt:
				remaining === 0 && usage.oldestAt
					? new Date(usage.oldestAt.getTime() + GENERATION_QUOTA_WINDOW_MS)
					: null,
			nextFreeInMs:
				usage.used > 0 && oldestLeavesAt !== null
					? Math.max(0, oldestLeavesAt - now.getTime())
					: null,
			options: options ?? DEFAULT_GENERATION_OPTIONS,
			pricing: deps.assistantSettings.pricing,
		};
	};
}
