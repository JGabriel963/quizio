import { GENERATION_MAX_QUESTIONS, type GenerationOptions } from "./generation";

/**
 * Credits per thousand tokens, as the instance sets them for its model
 * (spec 045, RN-04): output costs more than input, as in providers' prices.
 */
export interface CreditPricing {
	inputPer1kTokens: number;
	outputPer1kTokens: number;
}

/** With these, a short topic of about 10 questions costs about 1 credit (RN-01). */
export const DEFAULT_CREDIT_PRICING: CreditPricing = {
	inputPer1kTokens: 0.1,
	outputPer1kTokens: 0.25,
};

/** What the provider says a call used (RN-01). */
export interface TokenUsage {
	inputTokens: number;
	outputTokens: number;
}

/** What is known of the source before reading it (RN-06). */
export type GenerationSize =
	| { kind: "topic"; characters: number }
	| { kind: "pdf"; pages: number };

/** The most a creation may charge, and the output cap that keeps it true (RN-06, RN-07). */
export interface CreditEstimate {
	credits: number;
	maxOutputTokens: number;
}

/** What a creation costs: `charged` to the creator, `spent` for the instance (RN-09, RN-13). */
export interface GenerationCharge {
	charged: number;
	spent: number;
}

/** The instructions of `generationBrief` plus the output format. */
export const ESTIMATED_BRIEF_TOKENS = 1500;
/** On the safe side for Portuguese, Spanish and English. */
export const ESTIMATED_CHARACTERS_PER_TOKEN = 3;
/** A page as text and image; a scanned one may take more (plan, risks). */
export const ESTIMATED_TOKENS_PER_PDF_PAGE = 3000;
/** The JSON around the questions and a little reasoning. */
export const OUTPUT_TOKENS_BASE = 1000;
/** A statement, four answers and the keys of the flat format. */
export const OUTPUT_TOKENS_PER_QUESTION = 350;

export function parseCreditPricing(input: CreditPricing): CreditPricing {
	for (const weight of [input.inputPer1kTokens, input.outputPer1kTokens]) {
		if (!Number.isFinite(weight) || weight <= 0) {
			throw new RangeError("Credit weights must be positive numbers");
		}
	}
	return {
		inputPer1kTokens: input.inputPer1kTokens,
		outputPer1kTokens: input.outputPer1kTokens,
	};
}

/**
 * Whole credits for these tokens, rounded up and at least 1 (RN-02). The
 * weights become whole thousandths, so the sum stays exact until the last
 * division and 30 × 0.1 is 3, not a hair above it.
 */
function creditsForTokens(
	inputTokens: number,
	outputTokens: number,
	pricing: CreditPricing,
): number {
	const millionths =
		inputTokens * Math.round(pricing.inputPer1kTokens * 1000) +
		outputTokens * Math.round(pricing.outputPer1kTokens * 1000);
	return Math.max(1, Math.ceil(millionths / 1_000_000));
}

/** What a reported usage costs (RN-01, RN-02). */
export function creditsOf(usage: TokenUsage, pricing: CreditPricing): number {
	return creditsForTokens(usage.inputTokens, usage.outputTokens, pricing);
}

/** RN-07: the output cap grows with the questions asked; extracting asks for up to 30. */
export function maxOutputTokensFor(options: GenerationOptions): number {
	const questions =
		options.format === "extract" ? GENERATION_MAX_QUESTIONS : options.count;
	return OUTPUT_TOKENS_BASE + OUTPUT_TOKENS_PER_QUESTION * questions;
}

/**
 * The most a creation may cost (RN-06): the estimated input (instructions
 * plus the topic or the pages) and the whole output cap.
 */
export function estimateGeneration(
	size: GenerationSize,
	options: GenerationOptions,
	pricing: CreditPricing,
): CreditEstimate {
	const sourceTokens =
		size.kind === "topic"
			? Math.ceil(size.characters / ESTIMATED_CHARACTERS_PER_TOKEN)
			: size.pages * ESTIMATED_TOKENS_PER_PDF_PAGE;
	const maxOutputTokens = maxOutputTokensFor(options);
	return {
		credits: creditsForTokens(
			ESTIMATED_BRIEF_TOKENS + sourceTokens,
			maxOutputTokens,
			pricing,
		),
		maxOutputTokens,
	};
}

/**
 * What a creation costs once the provider answered (RN-09, RN-10, RN-13):
 * the creator pays the real usage up to the estimate, the instance spends
 * all of it. Without a reported usage (a timeout), the estimate.
 */
export function settleCharge(
	estimate: CreditEstimate,
	usage: TokenUsage | null,
	pricing: CreditPricing,
): GenerationCharge {
	if (!usage) {
		return { charged: estimate.credits, spent: estimate.credits };
	}
	const spent = creditsOf(usage, pricing);
	return { charged: Math.min(spent, estimate.credits), spent };
}
