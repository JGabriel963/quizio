import {
	type GeneratedDraft,
	GenerationChargedError,
	GenerationNotChargedError,
	type QuestionGeneration,
	type QuestionGenerationRequest,
	type QuestionGenerator,
} from "@quizio/core/quiz/application/ports/question-generator";
import type { TokenUsage } from "@quizio/core/quiz/domain/generation-credits";
import {
	APICallError,
	generateText,
	type LanguageModel,
	LoadAPIKeyError,
	type ModelMessage,
	NoObjectGeneratedError,
	Output,
	RetryError,
} from "ai";
import { z } from "zod";

import type { GenerationProviderOptions } from "./ai-model";

/**
 * The output format only: the limits and rules are the core's to enforce
 * (`acceptGeneratedQuestions`), so a question that breaks them is dropped
 * there, never cut here. Some room above the core's maximum of 30.
 *
 * Flat on purpose: OpenAI's strict structured output accepts no unions
 * (`oneOf`/`anyOf`) and wants every field present, so both types share one
 * shape, with `choices` empty and `correct` null where they do not apply.
 */
const outputSchema = z.object({
	questions: z
		.array(
			z.object({
				type: z.enum(["quiz", "trueFalse"]),
				text: z.string().describe("The question, or the true/false statement"),
				choices: z
					.array(z.object({ text: z.string(), correct: z.boolean() }))
					.describe(
						"The answers of a quiz question, in order; empty for true/false",
					),
				correct: z
					.boolean()
					.nullable()
					.describe("Whether a true/false statement is true; null for quiz"),
			}),
		)
		.max(40),
});

type FlatQuestion = z.infer<typeof outputSchema>["questions"][number];

/** Back to the core's drafts; a true/false without its answer is left out. */
function toDrafts(questions: FlatQuestion[]): GeneratedDraft[] {
	return questions.flatMap((question): GeneratedDraft[] => {
		if (question.type === "quiz") {
			return [{ type: "quiz", text: question.text, choices: question.choices }];
		}
		return question.correct === null
			? []
			: [{ type: "trueFalse", text: question.text, correct: question.correct }];
	});
}

function userMessage(
	source: QuestionGenerationRequest["source"],
): ModelMessage {
	if (source.kind === "topic") {
		return { role: "user", content: source.text };
	}
	return {
		role: "user",
		content: [
			{ type: "text", text: "Here is the document." },
			{ type: "file", data: source.document, mediaType: "application/pdf" },
		],
	};
}

export interface AiSdkQuestionGeneratorConfig {
	model: LanguageModel;
	/** A slower answer counts as a failure (spec 027, RN-33). */
	timeoutMs: number;
	/**
	 * The most the model may ever write, reasoning included, above each
	 * creation's own cap (spec 045, RN-07): what one call can cost at worst.
	 */
	maxOutputTokens: number;
	/** Per provider, from `generationProviderOptions` (spec 045, RN-07). */
	providerOptions?: GenerationProviderOptions;
}

/** The provider's report, or null when it lacks either number. */
function tokenUsageOf(
	usage:
		| { inputTokens: number | undefined; outputTokens: number | undefined }
		| undefined,
): TokenUsage | null {
	if (!usage) {
		return null;
	}
	const { inputTokens, outputTokens } = usage;
	return inputTokens === undefined || outputTokens === undefined
		? null
		: { inputTokens, outputTokens };
}

/**
 * Whether the provider gave no answer: a request it refused or never got
 * (no status, or 4xx/5xx), or the key missing. An answer it sent, even one
 * outside the format or cut by the timeout, was charged.
 */
function providerGaveNoAnswer(error: unknown): boolean {
	const last = RetryError.isInstance(error) ? error.lastError : error;
	if (LoadAPIKeyError.isInstance(last)) {
		return true;
	}
	return (
		APICallError.isInstance(last) &&
		(last.statusCode === undefined || last.statusCode >= 400)
	);
}

/** `QuestionGenerator` over the AI SDK (ADR 0012), for any provider it supports. */
export function createAiSdkQuestionGenerator(
	config: AiSdkQuestionGeneratorConfig,
): QuestionGenerator {
	return {
		async generate({
			brief,
			source,
			maxOutputTokens,
		}): Promise<QuestionGeneration> {
			try {
				const result = await generateText({
					model: config.model,
					system: brief,
					messages: [userMessage(source)],
					output: Output.object({ schema: outputSchema }),
					abortSignal: AbortSignal.timeout(config.timeoutMs),
					maxOutputTokens: Math.min(maxOutputTokens, config.maxOutputTokens),
					providerOptions: config.providerOptions,
					// One retry for a transient error.
					maxRetries: 1,
				});
				return {
					drafts: toDrafts(result.output.questions),
					usage: tokenUsageOf(result.usage),
				};
			} catch (error) {
				if (providerGaveNoAnswer(error)) {
					throw new GenerationNotChargedError("The provider gave no answer", {
						cause: error,
					});
				}
				// An answer outside the format was paid for as reported; a timeout,
				// or anything else, without a usage (spec 045, RN-10).
				const usage = NoObjectGeneratedError.isInstance(error)
					? tokenUsageOf(error.usage)
					: null;
				throw new GenerationChargedError(
					"The provider's answer was not usable",
					usage,
					{
						cause: error,
					},
				);
			}
		},
	};
}
