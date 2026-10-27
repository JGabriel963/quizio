import type { Clock } from "../../shared/application/ports/clock";
import {
	DEFAULT_GENERATION_OPTIONS,
	GENERATION_QUOTA_WINDOW_MS,
	type GenerationOptions,
} from "../domain/generation";
import type { AssistantPreferencesRepository } from "./ports/assistant-preferences-repository";
import type { GenerationQuota } from "./ports/generation-quota";
import type { QuestionGenerator } from "./ports/question-generator";

/** The instance's quota (RN-31): configurable, 20 by default. */
export interface AssistantSettings {
	generationsPerDay: number;
}

export interface AssistantStatus {
	/** False when the instance has no AI provider (RN-01). */
	enabled: boolean;
	limit: number;
	/** Generations in the last 24 hours ("Acesso à IA", spec 039, RN-17). */
	used: number;
	remaining: number;
	/** When the quota is used up, when the next generation frees up (RN-32). */
	nextAvailableAt: Date | null;
	/**
	 * With any generation in the window, how long until the oldest leaves it
	 * (spec 039, RN-17); a duration, never an instant for the device's clock.
	 */
	nextFreeInMs: number | null;
	/** The options the creator last generated with, or the defaults (RN-07). */
	options: GenerationOptions;
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
		const limit = deps.assistantSettings.generationsPerDay;
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
		};
	};
}
