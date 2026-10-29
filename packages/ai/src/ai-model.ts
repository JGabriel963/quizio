import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

/** Providers whose models read a PDF as a file (ADR 0012). */
export const AI_PROVIDERS = ["anthropic", "openai", "google"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export interface LanguageModelConfig {
	provider: AiProvider;
	apiKey: string;
	/** The provider's model id, e.g. `claude-sonnet-5-5`. */
	model: string;
}

/** Options for the provider's own SDK, as `generateText` takes them. */
export type GenerationProviderOptions = Record<
	string,
	Record<string, string | number | boolean>
>;

/**
 * Reasoning counts as output, so a model that thinks a lot would hit the cap
 * each creation gets for its questions (spec 045, RN-07). OpenAI is asked to
 * think little; the others reason only when asked to.
 */
export function generationProviderOptions(
	provider: AiProvider,
): GenerationProviderOptions | undefined {
	switch (provider) {
		case "openai":
			return { openai: { reasoningEffort: "low" } };
		case "anthropic":
		case "google":
			return undefined;
	}
}

/** The only place that knows the provider SDKs; the composition root picks one. */
export function createLanguageModel(
	config: LanguageModelConfig,
): LanguageModel {
	switch (config.provider) {
		case "anthropic":
			return createAnthropic({ apiKey: config.apiKey })(config.model);
		case "openai":
			return createOpenAI({ apiKey: config.apiKey })(config.model);
		case "google":
			return createGoogleGenerativeAI({ apiKey: config.apiKey })(config.model);
	}
}
