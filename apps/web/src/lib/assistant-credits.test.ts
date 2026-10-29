import { DEFAULT_GENERATION_OPTIONS } from "@quizio/core/quiz/domain/generation";
import { DEFAULT_CREDIT_PRICING } from "@quizio/core/quiz/domain/generation-credits";
import { describe, expect, it } from "vitest";

import { assistantEstimate } from "./assistant-credits";
import { type AssistantState, initialAssistantState } from "./assistant-state";

const pricing = DEFAULT_CREDIT_PRICING;

function stateWith(changes: Partial<AssistantState>): AssistantState {
	return {
		...initialAssistantState({
			options: { ...DEFAULT_GENERATION_OPTIONS, count: 10 },
		}),
		...changes,
	};
}

const pdf = { key: "sources/user-1/doc", name: "aula.pdf", pageTexts: [] };

describe("assistantEstimate (spec 045, RN-06)", () => {
	it("estimates a topic from its length and count", () => {
		expect(
			assistantEstimate(stateWith({ topic: "  Sistema solar  " }), pricing),
		).toEqual({ credits: 2, maxOutputTokens: 4500 });
	});

	it("estimates a PDF from the chosen pages", () => {
		const state = stateWith({
			source: "pdf",
			pdf,
			pages: Array.from({ length: 30 }, (_, index) => index + 1),
			options: { ...DEFAULT_GENERATION_OPTIONS, count: 20 },
		});

		expect(assistantEstimate(state, pricing)?.credits).toBe(12);
	});

	it("is null with nothing to create", () => {
		expect(assistantEstimate(stateWith({ topic: "   " }), pricing)).toBeNull();
		expect(
			assistantEstimate(stateWith({ source: "pdf", pdf, pages: [] }), pricing),
		).toBeNull();
		expect(
			assistantEstimate(stateWith({ source: "pdf", pdf: null }), pricing),
		).toBeNull();
	});
});
