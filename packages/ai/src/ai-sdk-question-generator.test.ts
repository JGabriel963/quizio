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
		const generator = createAiSdkQuestionGenerator({ model, timeoutMs: 1000 });

		const result = await generator.generate({ brief: "Brief", source: topic });

		expect(result).toEqual(drafts);
	});

	it("asks for a flat schema without unions, which OpenAI's strict mode accepts", async () => {
		const { model, calls } = respondWith(answer);
		const generator = createAiSdkQuestionGenerator({ model, timeoutMs: 1000 });

		await generator.generate({ brief: "Brief", source: topic });

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
		const generator = createAiSdkQuestionGenerator({ model, timeoutMs: 1000 });

		expect(await generator.generate({ brief: "Brief", source: topic })).toEqual(
			[],
		);
	});

	it("sends a topic as text and the brief as system", async () => {
		const { model, calls } = respondWith(answer);
		const generator = createAiSdkQuestionGenerator({ model, timeoutMs: 1000 });

		await generator.generate({ brief: "Write questions.", source: topic });

		const prompt = calls[0]?.prompt ?? [];
		expect(prompt[0]).toMatchObject({
			role: "system",
			content: "Write questions.",
		});
		expect(JSON.stringify(prompt[1])).toContain("Sistema solar");
	});

	it("sends a PDF as a file part", async () => {
		const { model, calls } = respondWith(answer);
		const generator = createAiSdkQuestionGenerator({ model, timeoutMs: 1000 });

		await generator.generate({
			brief: "Brief",
			source: { kind: "pdf", document: new Uint8Array([37, 80, 68, 70]) },
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

	it("a response outside the schema is a failure", async () => {
		const { model } = respondWith(JSON.stringify({ questions: [{ type: 1 }] }));
		const generator = createAiSdkQuestionGenerator({ model, timeoutMs: 1000 });

		await expect(
			generator.generate({ brief: "Brief", source: topic }),
		).rejects.toThrow();
	});

	it("times out as a failure", async () => {
		const model = new MockLanguageModelV4({
			doGenerate: ({ abortSignal }) =>
				new Promise((_, reject) => {
					abortSignal?.addEventListener("abort", () =>
						reject(abortSignal.reason),
					);
				}),
		});
		const generator = createAiSdkQuestionGenerator({ model, timeoutMs: 20 });

		await expect(
			generator.generate({ brief: "Brief", source: topic }),
		).rejects.toThrow();
	});
});
