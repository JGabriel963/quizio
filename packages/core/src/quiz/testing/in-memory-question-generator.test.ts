import { describe, expect, it } from "vitest";

import {
	creditsOf,
	DEFAULT_CREDIT_PRICING,
} from "../domain/generation-credits";
import { InMemoryQuestionGenerator } from "./in-memory-question-generator";

const request = {
	brief: "Brief",
	source: { kind: "topic", text: "Sistema solar" },
	maxOutputTokens: 4500,
} as const;

describe("InMemoryQuestionGenerator", () => {
	it("answers with a usage of 1 credit by default", async () => {
		const { usage } = await new InMemoryQuestionGenerator().generate(request);

		expect(usage && creditsOf(usage, DEFAULT_CREDIT_PRICING)).toBe(1);
	});

	it("answers with the usage it was told", async () => {
		const generator = new InMemoryQuestionGenerator();
		generator.respondWith([], { inputTokens: 30_000, outputTokens: 8000 });

		expect((await generator.generate(request)).usage).toEqual({
			inputTokens: 30_000,
			outputTokens: 8000,
		});
	});
});
