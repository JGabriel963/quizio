import { beforeEach, describe, expect, it } from "vitest";
import { sourceKeyFor } from "../../shared/domain/media-key";
import { NotFoundError } from "../../shared/domain/not-found-error";
import { FixedClock } from "../../shared/testing/fixed-clock";
import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { SequentialIdGenerator } from "../../shared/testing/sequential-id-generator";
import {
	DEFAULT_GENERATION_OPTIONS,
	EncryptedSourceError,
	GenerationFailedError,
	GenerationInstanceLimitError,
	GenerationQuotaExceededError,
	GenerationTopicEmptyError,
	GenerationUnavailableError,
	InvalidGenerationOptionsError,
	InvalidSourcePagesError,
	SourceNotFoundError,
} from "../domain/generation";
import {
	type CreditPricing,
	DEFAULT_CREDIT_PRICING,
} from "../domain/generation-credits";
import { QuizInTrashError, QuizNotFoundError } from "../domain/quiz";
import { aQuestion } from "../testing/a-question";
import { aQuiz } from "../testing/a-quiz";
import { FakePdfPages, fakePdf, readFakePdf } from "../testing/fake-pdf-pages";
import { InMemoryAssistantPreferencesRepository } from "../testing/in-memory-assistant-preferences-repository";
import { InMemoryGenerationQuota } from "../testing/in-memory-generation-quota";
import {
	aGeneratedDraft,
	InMemoryQuestionGenerator,
} from "../testing/in-memory-question-generator";
import { InMemoryQuestionRepository } from "../testing/in-memory-question-repository";
import { InMemoryQuizRepository } from "../testing/in-memory-quiz-repository";
import {
	createGenerateQuestions,
	type GenerateQuestionsInput,
} from "./generate-questions";
import {
	GenerationChargedError,
	GenerationNotChargedError,
} from "./ports/question-generator";

const pdfKey = sourceKeyFor("user-1", "doc");
const DAY = 24 * 60 * 60 * 1000;

describe("generateQuestions", () => {
	let quizzes: InMemoryQuizRepository;
	let generator: InMemoryQuestionGenerator;
	let quota: InMemoryGenerationQuota;
	let preferences: InMemoryAssistantPreferencesRepository;
	let storage: InMemoryObjectStorage;
	let clock: FixedClock;

	function build({
		enabled = true,
		creditsPerDay = 20,
		instanceCreditsPerDay = 1000,
		pricing = DEFAULT_CREDIT_PRICING,
	}: {
		enabled?: boolean;
		creditsPerDay?: number;
		instanceCreditsPerDay?: number;
		pricing?: CreditPricing;
	} = {}) {
		return createGenerateQuestions({
			quizzes,
			questions: new InMemoryQuestionRepository(),
			questionGenerator: enabled ? generator : null,
			generationQuota: quota,
			assistantPreferences: preferences,
			assistantSettings: { creditsPerDay, instanceCreditsPerDay, pricing },
			storage,
			pdfPages: new FakePdfPages(),
			ids: new SequentialIdGenerator("generated"),
			clock,
		});
	}

	const topic = (
		override: Partial<GenerateQuestionsInput> = {},
	): GenerateQuestionsInput => ({
		ownerId: "user-1",
		quizId: "quiz-1",
		source: { kind: "topic", text: "Sistema solar" },
		options: { ...DEFAULT_GENERATION_OPTIONS, count: 10 },
		...override,
	});

	const pdf = (
		pages: number[],
		override: Partial<GenerateQuestionsInput> = {},
	): GenerateQuestionsInput =>
		topic({ source: { kind: "pdf", key: pdfKey, pages }, ...override });

	const used = async () => (await quota.usage("user-1", DAY, clock.now())).used;

	beforeEach(async () => {
		quizzes = new InMemoryQuizRepository();
		generator = new InMemoryQuestionGenerator();
		quota = new InMemoryGenerationQuota();
		preferences = new InMemoryAssistantPreferencesRepository();
		storage = new InMemoryObjectStorage();
		clock = new FixedClock("2026-10-16T10:00:00.000Z");
		await quizzes.save(aQuiz());
		storage.put(pdfKey, fakePdf({ pages: 3 }));
	});

	it("generates from a topic and spends one use", async () => {
		const result = await build({ creditsPerDay: 5 })(topic());

		expect(result.questions).toHaveLength(3);
		expect(result.questions[0]).toMatchObject({
			id: "generated-1",
			type: "quiz",
			aiGenerated: true,
		});
		expect(result.discarded).toBe(0);
		expect(result.remaining).toBe(4);
		expect(await used()).toBe(1);
	});

	it("passes the brief and the topic to the generator", async () => {
		await build()(topic());

		const request = generator.requests[0];
		expect(request?.source).toEqual({ kind: "topic", text: "Sistema solar" });
		expect(request?.brief).toContain("about 10 questions");
	});

	it("refuses without a generator", async () => {
		await expect(build({ enabled: false })(topic())).rejects.toThrow(
			GenerationUnavailableError,
		);
	});

	it("another owner's quiz is not found", async () => {
		await expect(build()(topic({ ownerId: "user-2" }))).rejects.toThrow(
			QuizNotFoundError,
		);
	});

	it("a trashed quiz refuses", async () => {
		await quizzes.save(aQuiz({ trashedAt: clock.now() }));

		await expect(build()(topic())).rejects.toThrow(QuizInTrashError);
	});

	it("sends only the chosen pages to the generator", async () => {
		await build()(pdf([3, 1]));

		const source = generator.requests[0]?.source;
		if (source?.kind !== "pdf") {
			throw new Error("expected a PDF source");
		}
		expect(readFakePdf(source.document)?.selected).toEqual([3, 1]);
	});

	it("another owner's source is not found", async () => {
		const other = sourceKeyFor("user-2", "doc");
		storage.put(other, fakePdf({ pages: 3 }));

		const generating = build()(
			topic({ source: { kind: "pdf", key: other, pages: [1] } }),
		);

		await expect(generating).rejects.toThrow(SourceNotFoundError);
		await expect(generating).rejects.toBeInstanceOf(NotFoundError);
	});

	it("a missing source is not found", async () => {
		await storage.delete(pdfKey);

		await expect(build()(pdf([1]))).rejects.toThrow(SourceNotFoundError);
	});

	it("an encrypted PDF refuses without spending a use", async () => {
		storage.put(pdfKey, fakePdf({ pages: 3, encrypted: true }));

		await expect(build()(pdf([1]))).rejects.toThrow(EncryptedSourceError);
		expect(await used()).toBe(0);
	});

	it("invalid input never spends a use", async () => {
		const generate = build();

		await expect(
			generate(topic({ source: { kind: "topic", text: "  " } })),
		).rejects.toThrow(GenerationTopicEmptyError);
		await expect(
			generate(
				topic({
					options: { ...DEFAULT_GENERATION_OPTIONS, format: "extract" },
				}),
			),
		).rejects.toThrow(InvalidGenerationOptionsError);
		await expect(generate(pdf([4]))).rejects.toThrow(InvalidSourcePagesError);
		expect(await used()).toBe(0);
		expect(generator.requests).toHaveLength(0);
	});

	it("reserves the estimate before reading the PDF", async () => {
		// 3 pages for about 10 questions are estimated at 3 credits. An encrypted
		// PDF would be refused as such if it were read first.
		storage.put(pdfKey, fakePdf({ pages: 3, encrypted: true }));

		await expect(build({ creditsPerDay: 2 })(pdf([1, 2, 3]))).rejects.toThrow(
			GenerationQuotaExceededError,
		);
		expect(await used()).toBe(0);
	});

	it("refuses an estimate above what the creator has left, reading nothing", async () => {
		const generate = build({ creditsPerDay: 2 });
		await generate(topic());

		// 1 credit left; a topic of about 10 questions is estimated at 2.
		await expect(generate(topic())).rejects.toThrow(
			GenerationQuotaExceededError,
		);
		expect(generator.requests).toHaveLength(1);
		expect(await used()).toBe(1);
	});

	it("reads no PDF without a credit left", async () => {
		storage.put(pdfKey, fakePdf({ pages: 3, encrypted: true }));

		await expect(build({ creditsPerDay: 0 })(pdf([1]))).rejects.toThrow(
			GenerationQuotaExceededError,
		);
	});

	it("refuses an estimate above what the instance has left, reserving nothing", async () => {
		const generate = build({ instanceCreditsPerDay: 2 });
		await generate(topic());

		await expect(generate(topic())).rejects.toThrow(
			GenerationInstanceLimitError,
		);
		expect(generator.requests).toHaveLength(1);
		expect(await used()).toBe(1);
	});

	it("charges the real usage rounded up and gives the rest back", async () => {
		generator.respondWith([aGeneratedDraft()], {
			inputTokens: 1500,
			outputTokens: 2500,
		});

		const result = await build({ creditsPerDay: 5 })(topic());

		expect(result.creditsUsed).toBe(1);
		expect(result.remaining).toBe(4);
		expect(await used()).toBe(1);
	});

	it("never charges more than the estimate, while the instance spends the real usage", async () => {
		// 30,000 input and 8,000 output tokens cost 5 credits; the estimate is 2.
		generator.respondWith([aGeneratedDraft()], {
			inputTokens: 30_000,
			outputTokens: 8000,
		});

		const result = await build()(topic());

		expect(result.creditsUsed).toBe(2);
		expect(await used()).toBe(2);
		const ceiling = { perOwner: 100, instance: 7 };
		expect(
			(await quota.reserve("user-9", 3, ceiling, DAY, clock.now())).reserved,
		).toBe(false);
		expect(
			(await quota.reserve("user-9", 2, ceiling, DAY, clock.now())).reserved,
		).toBe(true);
	});

	it("a creation is settled with the real usage before the answer returns", async () => {
		generator.respondWith([aGeneratedDraft()], {
			inputTokens: 1500,
			outputTokens: 2500,
		});

		await build()(pdf([1, 2, 3]));

		// Reserved as 3, settled as 1: nothing waits for the screen.
		expect(await used()).toBe(1);
	});

	it("a provider that gave no answer charges nothing", async () => {
		generator.failNext(new GenerationNotChargedError("rate limited"));

		await expect(build()(topic())).rejects.toThrow(GenerationFailedError);
		expect(await used()).toBe(0);
	});

	it("a timeout charges the estimate", async () => {
		generator.failNext(new GenerationChargedError("timed out", null));

		await expect(build()(topic())).rejects.toThrow(GenerationFailedError);
		expect(await used()).toBe(2);
	});

	it("an answer outside the format charges the usage it reported", async () => {
		generator.failNext(
			new GenerationChargedError("outside the format", {
				inputTokens: 1500,
				outputTokens: 2500,
			}),
		);

		await expect(build()(topic())).rejects.toThrow(GenerationFailedError);
		expect(await used()).toBe(1);
	});

	it("extracting is estimated as 30 questions and charged", async () => {
		const result = await build()(
			pdf([1, 2], {
				options: { ...DEFAULT_GENERATION_OPTIONS, format: "extract" },
			}),
		);

		expect(generator.requests[0]?.maxOutputTokens).toBe(11_500);
		expect(result.creditsUsed).toBe(1);
	});

	it("doubled weights double what a creation charges", async () => {
		const doubled = { inputPer1kTokens: 0.2, outputPer1kTokens: 0.5 };

		const result = await build({ pricing: doubled })(topic());

		expect(result.creditsUsed).toBe(2);
	});

	it("tells the credits used and what is left", async () => {
		const result = await build({ creditsPerDay: 20 })(topic());

		expect(result).toMatchObject({ creditsUsed: 1, remaining: 19 });
	});

	it("a failed generation tells the creator nothing of the provider's answer", async () => {
		const providerError = new Error(
			"401: Incorrect API key provided: sk-…a1b2",
		);
		generator.failNext(providerError);

		const failure = await build()(topic()).catch((error: unknown) => error);

		expect(failure).toBeInstanceOf(GenerationFailedError);
		expect((failure as Error).message).not.toContain("API key");
		expect((failure as Error).cause).toBe(providerError);
	});

	it("returns no questions when nothing is valid and still spends the use", async () => {
		generator.respondWith([
			{ ...aGeneratedDraft(), text: "a".repeat(161) },
			{ type: "trueFalse", text: "Plutão é planeta", correct: false },
		]);

		const result = await build()(topic());

		expect(result.questions).toEqual([]);
		expect(result.discarded).toBe(2);
		expect(await used()).toBe(1);
	});

	it("remembers the options except extract", async () => {
		const options = {
			format: "mixed",
			language: "en",
			level: "advanced",
			count: 5,
		} as const;
		await build()(topic({ options }));
		await build()(pdf([1], { options: { ...options, format: "extract" } }));

		expect(await preferences.find("user-1")).toEqual(options);
	});

	it("keeps the extracted questions with the document's language", async () => {
		await build()(
			pdf([1, 2], {
				options: { ...DEFAULT_GENERATION_OPTIONS, format: "extract" },
			}),
		);

		expect(generator.requests[0]?.brief).toContain(
			"same language as the document",
		);
	});

	it("keeps the quiz untouched", async () => {
		const questions = new InMemoryQuestionRepository();
		await questions.saveList("quiz-1", [aQuestion()]);
		const generate = createGenerateQuestions({
			quizzes,
			questions,
			questionGenerator: generator,
			generationQuota: quota,
			assistantPreferences: preferences,
			assistantSettings: {
				creditsPerDay: 20,
				instanceCreditsPerDay: 1000,
				pricing: DEFAULT_CREDIT_PRICING,
			},
			storage,
			pdfPages: new FakePdfPages(),
			ids: new SequentialIdGenerator("generated"),
			clock,
		});

		await generate(topic());

		expect(questions.listOf("quiz-1")).toHaveLength(1);
	});
});
