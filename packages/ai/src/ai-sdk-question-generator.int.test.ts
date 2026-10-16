import { acceptGeneratedQuestions } from "@quizio/core/quiz/domain/accept-generated";
import { DEFAULT_GENERATION_OPTIONS } from "@quizio/core/quiz/domain/generation";
import { generationBrief } from "@quizio/core/quiz/domain/generation-brief";
import { asQuiz } from "@quizio/core/quiz/testing/a-question";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { AI_PROVIDERS, type AiProvider, createLanguageModel } from "./ai-model";
import { createAiSdkQuestionGenerator } from "./ai-sdk-question-generator";

const provider = process.env.AI_PROVIDER as AiProvider | undefined;
const apiKey = process.env.AI_API_KEY;
const model = process.env.AI_MODEL;
const configured =
	!!provider && AI_PROVIDERS.includes(provider) && !!apiKey && !!model;

// Calls the real provider, which costs money: only with the AI_* variables set.
describe.runIf(configured)(
	"AiSdkQuestionGenerator against a real provider",
	() => {
		it("generates quiz questions about a topic", async () => {
			const generator = createAiSdkQuestionGenerator({
				model: createLanguageModel({
					provider: provider as AiProvider,
					apiKey: apiKey as string,
					model: model as string,
				}),
				timeoutMs: 120_000,
			});
			const options = { ...DEFAULT_GENERATION_OPTIONS, count: 5 as const };

			const drafts = await generator.generate({
				brief: generationBrief(options, "topic"),
				source: { kind: "topic", text: "O sistema solar" },
			});

			let next = 0;
			const { questions } = acceptGeneratedQuestions(
				drafts,
				options,
				() => `q-${++next}`,
			);
			expect(questions.length).toBeGreaterThanOrEqual(3);
		});

		it("extracts the questions of a PDF with their answer key", async () => {
			const document = await PDFDocument.create();
			const font = await document.embedFont(StandardFonts.Helvetica);
			const page = document.addPage([595, 842]);
			[
				"1. Qual civilizacao desenvolveu a escrita cuneiforme?",
				"a) Maia  b) Fenicia  c) Sumerios  d) Egipcia",
				"2. Em que ano caiu o Imperio Romano do Ocidente?",
				"a) 800  b) 27 a.C.  c) 1453  d) 476",
				"Gabarito: 1-c, 2-d",
			].forEach((line, index) => {
				page.drawText(line, { x: 40, y: 790 - index * 24, size: 12, font });
			});
			const generator = createAiSdkQuestionGenerator({
				model: createLanguageModel({
					provider: provider as AiProvider,
					apiKey: apiKey as string,
					model: model as string,
				}),
				timeoutMs: 120_000,
			});
			const options = {
				format: "extract",
				language: "auto",
				level: "intermediate",
				count: 30,
			} as const;

			const drafts = await generator.generate({
				brief: generationBrief(options, "pdf"),
				source: { kind: "pdf", document: await document.save() },
			});

			let next = 0;
			const { questions } = acceptGeneratedQuestions(
				drafts,
				options,
				() => `q-${++next}`,
			);
			expect(questions).toHaveLength(2);
			const correctOf = (index: number) =>
				asQuiz(questions[index]).choices.find((choice) => choice.correct)?.text;
			expect(correctOf(0)).toMatch(/Sum/);
			expect(correctOf(1)).toMatch(/476/);
		});
	},
);
