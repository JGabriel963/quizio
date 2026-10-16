import type {
	GeneratedDraft,
	QuestionGenerationRequest,
	QuestionGenerator,
} from "@quizio/core/quiz/application/ports/question-generator";
import {
	generateText,
	type LanguageModel,
	type ModelMessage,
	Output,
} from "ai";
import { z } from "zod";

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
}

/** `QuestionGenerator` over the AI SDK (ADR 0012), for any provider it supports. */
export function createAiSdkQuestionGenerator(
	config: AiSdkQuestionGeneratorConfig,
): QuestionGenerator {
	return {
		async generate({ brief, source }): Promise<GeneratedDraft[]> {
			const result = await generateText({
				model: config.model,
				system: brief,
				messages: [userMessage(source)],
				output: Output.object({ schema: outputSchema }),
				abortSignal: AbortSignal.timeout(config.timeoutMs),
				// One retry for a transient error; the quota is given back on failure.
				maxRetries: 1,
			});
			return toDrafts(result.output.questions);
		},
	};
}
