import { describe, expect, it } from "vitest";

import {
	AI_PROVIDERS,
	createLanguageModel,
	generationProviderOptions,
} from "./ai-model";

describe("createLanguageModel", () => {
	it.each(AI_PROVIDERS)("builds a model for %s", (provider) => {
		const model = createLanguageModel({
			provider,
			apiKey: "test-key",
			model: "some-model",
		});

		expect(typeof model).toBe("object");
		if (typeof model === "string") {
			throw new Error("expected a model object");
		}
		expect(model.modelId).toBe("some-model");
		expect(model.provider).toContain(provider);
	});

	it("supports Anthropic, OpenAI and Google", () => {
		expect(AI_PROVIDERS).toEqual(["anthropic", "openai", "google"]);
	});
});

describe("generationProviderOptions (spec 045, RN-07)", () => {
	it("OpenAI is asked for a low reasoning effort", () => {
		expect(generationProviderOptions("openai")).toEqual({
			openai: { reasoningEffort: "low" },
		});
	});

	it("Anthropic and Google keep their defaults", () => {
		expect(generationProviderOptions("anthropic")).toBeUndefined();
		expect(generationProviderOptions("google")).toBeUndefined();
	});
});
