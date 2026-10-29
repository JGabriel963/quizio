import {
	type CreditEstimate,
	type CreditPricing,
	estimateGeneration,
	type GenerationSize,
} from "@quizio/core/quiz/domain/generation-credits";

import type { AssistantState } from "./assistant-state";

/**
 * What "Crie" may cost now (spec 045, RN-06), with the core's own function and
 * the weights the server sent, so the screen shows what the server will
 * reserve; null with nothing to create yet.
 */
export function assistantEstimate(
	state: AssistantState,
	pricing: CreditPricing,
): CreditEstimate | null {
	const size = sizeOf(state);
	return size && estimateGeneration(size, state.options, pricing);
}

/** The topic as `createIntent` sends it, or the chosen pages. */
function sizeOf(state: AssistantState): GenerationSize | null {
	if (state.source === "topic") {
		const text = state.topic.trim();
		return text === "" ? null : { kind: "topic", characters: text.length };
	}
	return state.pdf && state.pages.length > 0
		? { kind: "pdf", pages: state.pages.length }
		: null;
}
