import {
	GenerationChargedError,
	GenerationNotChargedError,
} from "@quizio/core/quiz/application/ports/question-generator";
import { APICallError } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";

import { createAiSdkQuestionGenerator } from "./ai-sdk-question-generator";

type GenerateOptions = Parameters<MockLanguageModelV4["doGenerate"]>[0];

function respondWith(text: string) {
	const calls: GenerateOptions[] = [];
	const model = new MockLanguageModelV4({
		doGenerate: async (options) => {
			calls.push(options);
			return {
				content: [{ type: "text", text }],
				finishReason: { unified: "stop", raw: undefined },
				usage: {
					inputTokens: {
						total: 10,
						noCache: 10,
						cacheRead: undefined,
						cacheWrite: undefined,
					},
					outputTokens: { total: 20, text: 20, reasoning: undefined },
				},
				warnings: [],
			};
		},
	});
	return { model, calls };
}

// The flat shape the model answers in: every field present, null when unused.
const answer = JSON.stringify({
	questions: [
		{
			type: "quiz",
			text: "Qual é o maior planeta?",
			choices: [
				{ text: "Terra", correct: false },
				{ text: "Júpiter", correct: true },
				{ text: "Marte", correct: false },
				{ text: "Vênus", correct: false },
			],
			correct: null,
		},
		{
			type: "trueFalse",
			text: "Plutão é um planeta anão",
			choices: [],
			correct: true,
		},
	],
});

const drafts = [
	{
		type: "quiz",
		text: "Qual é o maior planeta?",
		choices: [
			{ text: "Terra", correct: false },
			{ text: "Júpiter", correct: true },
			{ text: "Marte", correct: false },
			{ text: "Vênus", correct: false },
		],
	},
	{ type: "trueFalse", text: "Plutão é um planeta anão", correct: true },
];

const topic = { kind: "topic", text: "Sistema solar" } as const;

describe("AiSdkQuestionGenerator", () => {
	it("maps the model output to drafts", async () => {
		const { model } = respondWith(answer);
		const generator = createAiSdkQuestionGenerator({
			model,
			timeoutMs: 1000,
			maxOutputTokens: 8000,
		});

		const result = await generator.generate({
			brief: "Brief",
			source: topic,
			maxOutputTokens: 4000,
		});

		expect(result.drafts).toEqual(drafts);
	});

	it("asks for a flat schema without unions, which OpenAI's strict mode accepts", async () => {
		const { model, calls } = respondWith(answer);
		const generator = createAiSdkQuestionGenerator({
			model,
			timeoutMs: 1000,
			maxOutputTokens: 8000,
		});

		await generator.generate({
			brief: "Brief",
			source: topic,
			maxOutputTokens: 4000,
		});

		const format = calls[0]?.responseFormat;
		expect(format?.type).toBe("json");
		const schema = JSON.stringify(
			format?.type === "json" ? format.schema : null,
		);
		expect(schema).not.toContain("oneOf");
		expect(schema).not.toContain("anyOf");
	});

	it("drops a true/false question without its answer", async () => {
		const { model } = respondWith(
			JSON.stringify({
				questions: [
					{
						type: "trueFalse",
						text: "Sem resposta",
						choices: [],
						correct: null,
					},
				],
			}),
		);
		const generator = createAiSdkQuestionGenerator({
			model,
			timeoutMs: 1000,
			maxOutputTokens: 8000,
		});

		expect(
			(
				await generator.generate({
					brief: "Brief",
					source: topic,
					maxOutputTokens: 4000,
				})
			).drafts,
		).toEqual([]);
	});

	it("sends a topic as text and the brief as system", async () => {
		const { model, calls } = respondWith(answer);
		const generator = createAiSdkQuestionGenerator({
			model,
			timeoutMs: 1000,
			maxOutputTokens: 8000,
		});

		await generator.generate({
			brief: "Write questions.",
			source: topic,
			maxOutputTokens: 4000,
		});

		const prompt = calls[0]?.prompt ?? [];
		expect(prompt[0]).toMatchObject({
			role: "system",
			content: "Write questions.",
		});
		expect(JSON.stringify(prompt[1])).toContain("Sistema solar");
	});

	it("sends a PDF as a file part", async () => {
		const { model, calls } = respondWith(answer);
		const generator = createAiSdkQuestionGenerator({
			model,
			timeoutMs: 1000,
			maxOutputTokens: 8000,
		});

		await generator.generate({
			brief: "Brief",
			source: { kind: "pdf", document: new Uint8Array([37, 80, 68, 70]) },
			maxOutputTokens: 4000,
		});

		const user = calls[0]?.prompt[1];
		expect(user?.role).toBe("user");
		expect(user?.content).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: "file",
					mediaType: "application/pdf",
				}),
			]),
		);
	});

	it("asks for the request's output cap, within the configured one", async () => {
		const { model, calls } = respondWith(answer);
		const generator = createAiSdkQuestionGenerator({
			model,
			timeoutMs: 1000,
			maxOutputTokens: 8000,
		});

		await generator.generate({
			brief: "Brief",
			source: topic,
			maxOutputTokens: 4500,
		});
		await generator.generate({
			brief: "Brief",
			source: topic,
			maxOutputTokens: 20_000,
		});

		expect(calls.map((call) => call.maxOutputTokens)).toEqual([4500, 8000]);
	});

	it("returns the usage the provider reported", async () => {
		const { model } = respondWith(answer);
		const generator = createAiSdkQuestionGenerator({
			model,
			timeoutMs: 1000,
			maxOutputTokens: 8000,
		});

		const result = await generator.generate({
			brief: "Brief",
			source: topic,
			maxOutputTokens: 4000,
		});

		expect(result.usage).toEqual({ inputTokens: 10, outputTokens: 20 });
	});

	it("a usage the provider did not report is null", async () => {
		const model = new MockLanguageModelV4({
			doGenerate: async () => ({
				content: [{ type: "text", text: answer }],
				finishReason: { unified: "stop", raw: undefined },
				usage: {
					inputTokens: {
						total: undefined,
						noCache: undefined,
						cacheRead: undefined,
						cacheWrite: undefined,
					},
					outputTokens: {
						total: undefined,
						text: undefined,
						reasoning: undefined,
					},
				},
				warnings: [],
			}),
		});
		const generator = createAiSdkQuestionGenerator({
			model,
			timeoutMs: 1000,
			maxOutputTokens: 8000,
		});

		const result = await generator.generate({
			brief: "Brief",
			source: topic,
			maxOutputTokens: 4000,
		});

		expect(result.usage).toBeNull();
	});

	it("an answer outside the format is charged by the usage it reports", async () => {
		const { model } = respondWith(JSON.stringify({ questions: [{ type: 1 }] }));
		const generator = createAiSdkQuestionGenerator({
			model,
			timeoutMs: 1000,
			maxOutputTokens: 8000,
		});

		const failure = await generator
			.generate({ brief: "Brief", source: topic, maxOutputTokens: 4000 })
			.catch((error: unknown) => error);

		expect(failure).toBeInstanceOf(GenerationChargedError);
		expect((failure as GenerationChargedError).usage).toEqual({
			inputTokens: 10,
			outputTokens: 20,
		});
	});

	it("passes the provider's options to the model", async () => {
		const { model, calls } = respondWith(answer);
		const generator = createAiSdkQuestionGenerator({
			model,
			timeoutMs: 1000,
			maxOutputTokens: 8000,
			providerOptions: { openai: { reasoningEffort: "low" } },
		});

		await generator.generate({
			brief: "Brief",
			source: topic,
			maxOutputTokens: 4000,
		});

		expect(calls[0]?.providerOptions).toEqual({
			openai: { reasoningEffort: "low" },
		});
	});

	it.each([
		// Retried once after the SDK's delay, then given up.
		["a rate limit", 429, true],
		["a refused key", 401, false],
		["a failure on the provider's side", 503, false],
		["no answer at all", undefined, false],
	])(
		"%s is a failure nothing was charged for",
		async (_, statusCode, isRetryable) => {
			const model = new MockLanguageModelV4({
				doGenerate: async () => {
					throw new APICallError({
						message: "refused",
						url: "https://provider.example/v1",
						requestBodyValues: {},
						statusCode,
						isRetryable,
					});
				},
			});
			const generator = createAiSdkQuestionGenerator({
				model,
				timeoutMs: 10_000,
				maxOutputTokens: 8000,
			});

			await expect(
				generator.generate({
					brief: "Brief",
					source: topic,
					maxOutputTokens: 4000,
				}),
			).rejects.toThrow(GenerationNotChargedError);
		},
	);

	it("a timeout is charged without a usage", async () => {
		const model = new MockLanguageModelV4({
			doGenerate: ({ abortSignal }) =>
				new Promise((_, reject) => {
					abortSignal?.addEventListener("abort", () =>
						reject(abortSignal.reason),
					);
				}),
		});
		const generator = createAiSdkQuestionGenerator({
			model,
			timeoutMs: 20,
			maxOutputTokens: 8000,
		});

		const failure = await generator
			.generate({ brief: "Brief", source: topic, maxOutputTokens: 4000 })
			.catch((error: unknown) => error);

		// The provider may have worked until the timeout: the estimate is charged.
		expect(failure).toBeInstanceOf(GenerationChargedError);
		expect((failure as GenerationChargedError).usage).toBeNull();
	});
});
