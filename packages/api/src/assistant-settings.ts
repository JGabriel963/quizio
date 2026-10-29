import type { AssistantSettings } from "@quizio/core/quiz/application/get-assistant-status";
import {
	DEFAULT_CREDIT_PRICING,
	parseCreditPricing,
} from "@quizio/core/quiz/domain/generation-credits";

/** The variables of the creation assistant's credits, as `@quizio/env` validates them. */
export interface AssistantEnv {
	AI_CREDITS_PER_DAY?: number;
	AI_INSTANCE_CREDITS_PER_DAY?: number;
	/** Before spec 045 the budget counted creations; it is still read as credits. */
	AI_GENERATIONS_PER_DAY: number;
	AI_INSTANCE_GENERATIONS_PER_DAY: number;
	AI_CREDITS_PER_1K_INPUT_TOKENS?: number;
	AI_CREDITS_PER_1K_OUTPUT_TOKENS?: number;
}

/**
 * The instance's credits (spec 045, RN-03, RN-04, RN-13). The names of
 * before stand in for the new ones, so an instance configured then keeps its
 * numbers: each creation counted 1, and a typical one costs about 1 credit.
 */
export function assistantSettingsOf(env: AssistantEnv): AssistantSettings {
	return {
		creditsPerDay: env.AI_CREDITS_PER_DAY ?? env.AI_GENERATIONS_PER_DAY,
		instanceCreditsPerDay:
			env.AI_INSTANCE_CREDITS_PER_DAY ?? env.AI_INSTANCE_GENERATIONS_PER_DAY,
		pricing: parseCreditPricing({
			inputPer1kTokens:
				env.AI_CREDITS_PER_1K_INPUT_TOKENS ??
				DEFAULT_CREDIT_PRICING.inputPer1kTokens,
			outputPer1kTokens:
				env.AI_CREDITS_PER_1K_OUTPUT_TOKENS ??
				DEFAULT_CREDIT_PRICING.outputPer1kTokens,
		}),
	};
}
