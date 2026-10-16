import { describe, expect, it } from "vitest";

import { AI_PROVIDERS, createLanguageModel } from "./ai-model";

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
