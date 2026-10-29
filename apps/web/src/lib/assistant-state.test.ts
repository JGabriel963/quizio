import { DEFAULT_GENERATION_OPTIONS } from "@quizio/core/quiz/domain/generation";
import { describe, expect, it } from "vitest";

import {
	type AssistantState,
	assistantReducer,
	checkedQuestions,
	createIntent,
	initialAssistantState,
	pendingQuestionCount,
} from "./assistant-state";

const generated = (ids: string[]) =>
	ids.map((id) => ({
		id,
		type: "trueFalse" as const,
		text: `Pergunta ${id}`,
		timeLimitSeconds: 20 as const,
		points: "standard" as const,
		image: null,
		aiGenerated: true,
		correct: true,
	}));

const exerciseList = [
	"1. Qual é a capital do Brasil?\na) Rio\nb) Brasília",
	"2. Qual é o maior planeta?\na) Terra\nb) Júpiter",
];

function run(
	state: AssistantState,
	...events: Parameters<typeof assistantReducer>[1][]
) {
	return events.reduce(assistantReducer, state);
}

const start = initialAssistantState({ options: DEFAULT_GENERATION_OPTIONS });

const pdf = {
	key: "sources/user-1/doc.pdf",
	name: "lista.pdf",
	pageTexts: ["Texto corrido sobre história.", "Mais texto."],
};

describe("assistant state", () => {
	it("starts on the topic source", () => {
		expect(start).toMatchObject({
			source: "topic",
			step: "main",
			topic: "",
			generation: { status: "idle" },
		});
		expect(createIntent(start)).toEqual({ kind: "none" });
	});

	it("can start on the PDF upload", () => {
		expect(
			initialAssistantState({
				options: DEFAULT_GENERATION_OPTIONS,
				source: "pdf",
			}),
		).toMatchObject({ source: "pdf", step: "pdfUpload" });
	});

	it("generates from a topic with the panel's options", () => {
		const state = run(start, { type: "topicChanged", topic: "Sistema solar" });

		expect(createIntent(state)).toEqual({
			kind: "generate",
			request: {
				source: { kind: "topic", text: "Sistema solar" },
				options: DEFAULT_GENERATION_OPTIONS,
			},
		});
	});

	it("cuts the topic at the limit", () => {
		const state = run(start, {
			type: "topicChanged",
			topic: "a".repeat(20_005),
		});

		expect(state.topic).toHaveLength(20_000);
	});

	it("a PDF goes upload, pages, then generating", () => {
		const state = run(
			start,
			{ type: "sourceChanged", source: "pdf" },
			{ type: "uploadOpened" },
		);
		expect(state.step).toBe("pdfUpload");

		const loaded = run(state, { type: "pdfLoaded", pdf });
		expect(loaded).toMatchObject({ step: "pdfPages", pages: [] });
		expect(createIntent(loaded)).toEqual({ kind: "none" });

		const chosen = run(loaded, { type: "pageToggled", page: 2 });
		expect(createIntent(chosen)).toEqual({
			kind: "generate",
			request: {
				source: { kind: "pdf", key: pdf.key, pages: [2] },
				options: DEFAULT_GENERATION_OPTIONS,
			},
		});

		const generating = run(chosen, { type: "generationStarted" });
		expect(generating).toMatchObject({
			step: "main",
			generation: { status: "generating" },
		});
	});

	it("select all checks the first 50 pages", () => {
		const big = run(start, {
			type: "pdfLoaded",
			pdf: { ...pdf, pageTexts: Array.from({ length: 60 }, () => "") },
		});

		const all = run(big, { type: "allPagesSelected" });

		expect(all.pages).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
		expect(run(all, { type: "pageToggled", page: 55 }).pages).toHaveLength(50);
		const swapped = run(
			all,
			{ type: "pageToggled", page: 3 },
			{ type: "pageToggled", page: 55 },
		);
		expect(swapped.pages).toContain(55);
		expect(swapped.pages).not.toContain(3);
	});

	it("asks extract or generate when the pages look like questions", () => {
		const state = run(
			start,
			{ type: "pdfLoaded", pdf: { ...pdf, pageTexts: exerciseList } },
			{ type: "pageToggled", page: 1 },
			{ type: "pageToggled", page: 2 },
		);

		expect(createIntent(state)).toEqual({ kind: "askExtract" });
		const asking = run(state, { type: "extractAsked" });
		expect(asking.step).toBe("extractOrGenerate");

		const extracting = run(asking, { type: "extractChosen", extract: true });
		expect(createIntent(extracting)).toMatchObject({
			kind: "generate",
			request: { options: { format: "extract" } },
		});
		const generating = run(asking, { type: "extractChosen", extract: false });
		expect(createIntent(generating)).toMatchObject({
			kind: "generate",
			request: { options: { format: "quiz" } },
		});
	});

	it("the switch on skips the question", () => {
		const state = run(
			start,
			{ type: "pdfLoaded", pdf: { ...pdf, pageTexts: exerciseList } },
			{ type: "pageToggled", page: 1 },
			{ type: "extractToggled", extract: true },
		);

		expect(state.options.format).toBe("extract");
		expect(createIntent(state)).toMatchObject({
			kind: "generate",
			request: { options: { format: "extract" } },
		});
		expect(
			run(state, { type: "extractToggled", extract: false }).options.format,
		).toBe("quiz");
	});

	it("extract is never kept for a topic", () => {
		const state = run(
			start,
			{ type: "sourceChanged", source: "pdf" },
			{ type: "optionsChanged", options: { format: "extract" } },
			{ type: "sourceChanged", source: "topic" },
		);

		expect(state.options.format).toBe("quiz");
	});

	it("checks the questions and counts them", () => {
		const state = run(
			start,
			{ type: "generationStarted" },
			{
				type: "generationSucceeded",
				result: {
					questions: generated(["a", "b", "c"]),
					discarded: 1,
					creditsUsed: 1,
				},
			},
			{ type: "questionToggled", id: "a" },
			{ type: "questionToggled", id: "c" },
			{ type: "questionToggled", id: "a" },
		);

		expect(state.generation).toMatchObject({ status: "done", discarded: 1 });
		expect(checkedQuestions(state).map(({ id }) => id)).toEqual(["c"]);
		expect(pendingQuestionCount(state)).toBe(3);
	});

	it("asks before replacing checked questions; cancel keeps the grid", () => {
		const done = run(
			start,
			{ type: "topicChanged", topic: "Planetas" },
			{
				type: "generationSucceeded",
				result: { questions: generated(["a"]), discarded: 0, creditsUsed: 1 },
			},
		);
		expect(createIntent(done)).toMatchObject({ kind: "generate" });

		const checked = run(done, { type: "questionToggled", id: "a" });
		expect(createIntent(checked)).toEqual({ kind: "confirmReplace" });

		const cancelled = run(
			checked,
			{ type: "confirmAsked", confirm: "replace" },
			{ type: "confirmCancelled" },
		);
		expect(cancelled.confirm).toBeNull();
		expect(checkedQuestions(cancelled)).toHaveLength(1);
		expect(createIntent(cancelled, { confirmed: true })).toMatchObject({
			kind: "generate",
		});
	});

	it("asks before discarding generated questions on close", () => {
		expect(run(start, { type: "closeRequested" }).closing).toBe(true);

		const done = run(start, {
			type: "generationSucceeded",
			result: { questions: generated(["a"]), discarded: 0, creditsUsed: 1 },
		});
		const asked = run(done, { type: "closeRequested" });
		expect(asked).toMatchObject({ closing: false, confirm: "close" });
		expect(run(asked, { type: "confirmCancelled" }).confirm).toBeNull();
	});

	it("back keeps the chosen pages", () => {
		const state = run(
			start,
			{ type: "pdfLoaded", pdf },
			{ type: "pageToggled", page: 2 },
			{ type: "backRequested" },
		);
		expect(state.step).toBe("pdfUpload");

		const forward = run(state, { type: "pdfPagesReopened" });
		expect(forward).toMatchObject({ step: "pdfPages", pages: [2] });
		expect(
			run(forward, { type: "extractAsked" }, { type: "backRequested" }).step,
		).toBe("pdfPages");
	});

	it("keeps the topic and the options after a failure", () => {
		const state = run(
			start,
			{ type: "topicChanged", topic: "Planetas" },
			{ type: "generationStarted" },
			{ type: "generationFailed", message: "Falhou." },
		);

		expect(state).toMatchObject({
			topic: "Planetas",
			generation: { status: "failed", message: "Falhou." },
		});
	});

	it("switches the layout", () => {
		expect(start.layout).toBe("grid");
		expect(run(start, { type: "layoutChanged", layout: "list" }).layout).toBe(
			"list",
		);
	});
});
