import { DEFAULT_GENERATION_OPTIONS } from "@quizio/core/quiz/domain/generation";
import { DEFAULT_CREDIT_PRICING } from "@quizio/core/quiz/domain/generation-credits";
import { aQuestion } from "@quizio/core/quiz/testing/a-question";
import { aQuiz } from "@quizio/core/quiz/testing/a-quiz";
import { fakePdf } from "@quizio/core/quiz/testing/fake-pdf-pages";
import { aGeneratedDraft } from "@quizio/core/quiz/testing/in-memory-question-generator";
import { sourceKeyFor } from "@quizio/core/shared/domain/media-key";
import { beforeEach, describe, expect, it } from "vitest";

import { createTestApi, type TestApi } from "../testing/test-context";

const topic = {
	quizId: "quiz-1",
	source: { kind: "topic" as const, text: "Sistema solar" },
	options: { ...DEFAULT_GENERATION_OPTIONS, count: 10 },
};

describe("quiz.assistant router", () => {
	let api: TestApi;

	beforeEach(async () => {
		api = createTestApi();
		await api.quizzes.save(aQuiz());
		await api.questions.saveList("quiz-1", [aQuestion({ id: "a" })]);
	});

	it("status says disabled without a generator", async () => {
		const disabled = createTestApi({ questionGenerator: null });

		const status = await disabled.callerFor("user-1").quiz.assistant.status();

		expect(status).toMatchObject({ enabled: false });
	});

	it("status carries the credits and the weights (spec 045)", async () => {
		const status = await api.callerFor("user-1").quiz.assistant.status();

		expect(status).toEqual({
			enabled: true,
			limit: 20,
			used: 0,
			remaining: 20,
			nextAvailableAt: null,
			nextFreeInMs: null,
			options: DEFAULT_GENERATION_OPTIONS,
			pricing: DEFAULT_CREDIT_PRICING,
		});
	});

	it("generate returns the credits used (spec 045, RN-09)", async () => {
		await api.quizzes.save(aQuiz());

		const result = await api.callerFor("user-1").quiz.assistant.generate(topic);

		expect(result).toMatchObject({ creditsUsed: 1, remaining: 19 });
	});

	it("requires a session", async () => {
		await expect(
			api.callerFor(null).quiz.assistant.status(),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
		await expect(
			api.callerFor(null).quiz.assistant.generate(topic),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
	});

	it("generate refuses without a generator", async () => {
		const disabled = createTestApi({ questionGenerator: null });
		await disabled.quizzes.save(aQuiz());

		await expect(
			disabled.callerFor("user-1").quiz.assistant.generate(topic),
		).rejects.toMatchObject({
			code: "BAD_REQUEST",
			cause: { code: "QUIZ.GENERATION_UNAVAILABLE" },
		});
	});

	it("generates from a topic", async () => {
		const result = await api.callerFor("user-1").quiz.assistant.generate(topic);

		expect(result.questions).toHaveLength(3);
		expect(result.questions[0]).toMatchObject({ aiGenerated: true });
		expect(result).toMatchObject({ discarded: 0, remaining: 19 });
		expect(api.questions.listOf("quiz-1")).toHaveLength(1);
	});

	it("maps the quota error with its domain code", async () => {
		const limited = createTestApi({
			// A topic is estimated at 2 credits and charged 1: the second does not fit.
			assistantSettings: {
				creditsPerDay: 2,
				instanceCreditsPerDay: 1000,
				pricing: DEFAULT_CREDIT_PRICING,
			},
		});
		await limited.quizzes.save(aQuiz());
		const caller = limited.callerFor("user-1");
		await caller.quiz.assistant.generate(topic);

		await expect(caller.quiz.assistant.generate(topic)).rejects.toMatchObject({
			code: "BAD_REQUEST",
			cause: { code: "QUIZ.GENERATION_QUOTA_EXCEEDED" },
		});
		expect(await caller.quiz.assistant.status()).toMatchObject({
			remaining: 1,
			nextAvailableAt: null,
		});
	});

	it("another owner's quiz is NOT_FOUND", async () => {
		await expect(
			api.callerFor("user-2").quiz.assistant.generate(topic),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});

	it("generates from the chosen pages of the caller's PDF", async () => {
		const key = sourceKeyFor("user-1", "doc");
		api.storage.put(key, fakePdf({ pages: 3 }));

		const result = await api.callerFor("user-1").quiz.assistant.generate({
			...topic,
			source: { kind: "pdf", key, pages: [2] },
		});

		expect(result.questions).toHaveLength(3);
	});

	it("another owner's source is NOT_FOUND", async () => {
		const key = sourceKeyFor("user-2", "doc");
		api.storage.put(key, fakePdf({ pages: 3 }));

		await expect(
			api.callerFor("user-1").quiz.assistant.generate({
				...topic,
				source: { kind: "pdf", key, pages: [1] },
			}),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
			cause: { code: "QUIZ.SOURCE_NOT_FOUND" },
		});
	});

	it("add appends the questions and returns the first index", async () => {
		const result = await api.callerFor("user-1").quiz.assistant.add({
			quizId: "quiz-1",
			questions: [aGeneratedDraft(1), aGeneratedDraft(2)],
		});

		expect(result.firstIndex).toBe(1);
		expect(api.questions.listOf("quiz-1").map(({ id }) => id)).toEqual([
			"a",
			...result.questions.map(({ id }) => id),
		]);
		expect(api.questions.listOf("quiz-1")[2]?.aiGenerated).toBe(true);
	});

	it("rejects a malformed option shape", async () => {
		await expect(
			api.callerFor("user-1").quiz.assistant.generate({
				...topic,
				options: { ...topic.options, format: "slider" as "quiz" },
			}),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});
});
