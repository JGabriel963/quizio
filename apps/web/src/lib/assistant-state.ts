import {
	GENERATION_MAX_PAGES,
	GENERATION_TOPIC_MAX_LENGTH,
	type GenerationFormat,
	type GenerationOptions,
} from "@quizio/core/quiz/domain/generation";
import { looksLikeQuestionList } from "@quizio/core/quiz/domain/question-source-heuristics";
import { truncateCharacters } from "@quizio/core/shared/domain/text-length";

import type { GeneratedQuestionData } from "./api-types";

/**
 * What the creation assistant is showing (spec 027), as a pure reducer: the
 * screens dispatch events and ask `createIntent` what "Crie" should do; the
 * calls to the API happen outside.
 */

export type AssistantSource = "topic" | "pdf";
export type AssistantStep =
	/** The source bar with the results below. */
	"main" | "pdfUpload" | "pdfPages" | "extractOrGenerate";
export type AssistantLayout = "single" | "grid" | "list";

export interface LoadedPdf {
	/** The key in storage, once uploaded. */
	key: string;
	name: string;
	/** The text pdf.js read from each page, for "already has questions?" (RN-16). */
	pageTexts: string[];
}

export type Generation =
	| { status: "idle" }
	| { status: "generating" }
	| {
			status: "done";
			questions: GeneratedQuestionData[];
			discarded: number;
			/** What was asked, to tell when fewer came (RN-22); null when extracting. */
			requested: number | null;
	  }
	| { status: "failed"; message: string };

export interface AssistantState {
	source: AssistantSource;
	step: AssistantStep;
	topic: string;
	pdf: LoadedPdf | null;
	/** Chosen pages, 1-based, in the order they were checked. */
	pages: number[];
	/** The creator already answered "Extrair ou gerar?" for these pages. */
	extractDecided: boolean;
	options: GenerationOptions;
	/** The format to go back to when extracting is turned off. */
	formatBeforeExtract: Exclude<GenerationFormat, "extract">;
	generation: Generation;
	checked: string[];
	layout: AssistantLayout;
	confirm: "replace" | "close" | null;
	/** The assistant may close: nothing created is left unadded (RN-30). */
	closing: boolean;
}

export type AssistantEvent =
	| { type: "sourceChanged"; source: AssistantSource }
	| { type: "topicChanged"; topic: string }
	| { type: "optionsChanged"; options: Partial<GenerationOptions> }
	| { type: "uploadOpened" }
	| { type: "pdfLoaded"; pdf: LoadedPdf }
	| { type: "pdfRemoved" }
	| { type: "pdfPagesReopened" }
	| { type: "pageToggled"; page: number }
	| { type: "allPagesSelected" }
	| { type: "extractToggled"; extract: boolean }
	| { type: "extractAsked" }
	| { type: "extractChosen"; extract: boolean }
	| { type: "generationStarted"; request?: GenerationRequest }
	| {
			type: "generationSucceeded";
			result: { questions: GeneratedQuestionData[]; discarded: number };
	  }
	| { type: "generationFailed"; message: string }
	| { type: "questionToggled"; id: string }
	| { type: "layoutChanged"; layout: AssistantLayout }
	| { type: "confirmAsked"; confirm: "replace" | "close" }
	| { type: "confirmCancelled" }
	| { type: "closeRequested" }
	| { type: "backRequested" };

export interface GenerationRequest {
	source:
		| { kind: "topic"; text: string }
		| { kind: "pdf"; key: string; pages: number[] };
	options: GenerationOptions;
}

export type CreateIntent =
	/** Crie is not available yet: no topic, no file or no page. */
	| { kind: "none" }
	| { kind: "confirmReplace" }
	| { kind: "askExtract" }
	| { kind: "generate"; request: GenerationRequest };

export function initialAssistantState({
	options,
	source = "topic",
}: {
	options: GenerationOptions;
	source?: AssistantSource;
}): AssistantState {
	const format = options.format === "extract" ? "quiz" : options.format;
	return {
		source,
		step: source === "pdf" ? "pdfUpload" : "main",
		topic: "",
		pdf: null,
		pages: [],
		extractDecided: false,
		options: { ...options, format },
		formatBeforeExtract: format,
		generation: { status: "idle" },
		checked: [],
		layout: "grid",
		confirm: null,
		closing: false,
	};
}

function withExtract(state: AssistantState, extract: boolean): AssistantState {
	if (extract === (state.options.format === "extract")) {
		return state;
	}
	return extract
		? {
				...state,
				formatBeforeExtract:
					state.options.format === "extract"
						? state.formatBeforeExtract
						: state.options.format,
				options: { ...state.options, format: "extract" },
			}
		: {
				...state,
				options: { ...state.options, format: state.formatBeforeExtract },
			};
}

function togglePage(pages: number[], page: number): number[] {
	if (pages.includes(page)) {
		return pages.filter((chosen) => chosen !== page);
	}
	return pages.length >= GENERATION_MAX_PAGES ? pages : [...pages, page];
}

export function assistantReducer(
	state: AssistantState,
	event: AssistantEvent,
): AssistantState {
	switch (event.type) {
		case "sourceChanged": {
			const next = { ...state, source: event.source, step: "main" as const };
			return event.source === "topic" ? withExtract(next, false) : next;
		}
		case "topicChanged":
			return {
				...state,
				topic: truncateCharacters(event.topic, GENERATION_TOPIC_MAX_LENGTH),
			};
		case "optionsChanged": {
			const { format, ...rest } = event.options;
			const next = { ...state, options: { ...state.options, ...rest } };
			if (format === undefined) {
				return next;
			}
			if (format === "extract") {
				return withExtract(next, true);
			}
			return {
				...next,
				options: { ...next.options, format },
				formatBeforeExtract: format,
			};
		}
		case "uploadOpened":
			return { ...state, source: "pdf", step: "pdfUpload" };
		case "pdfLoaded":
			return {
				...state,
				source: "pdf",
				step: "pdfPages",
				pdf: event.pdf,
				pages: [],
				extractDecided: false,
			};
		case "pdfRemoved":
			return { ...state, step: "main", pdf: null, pages: [] };
		case "pdfPagesReopened":
			return state.pdf ? { ...state, step: "pdfPages" } : state;
		case "pageToggled":
			return {
				...state,
				pages: togglePage(state.pages, event.page),
				extractDecided: false,
			};
		case "allPagesSelected": {
			const count = Math.min(
				state.pdf?.pageTexts.length ?? 0,
				GENERATION_MAX_PAGES,
			);
			return {
				...state,
				pages: Array.from({ length: count }, (_, index) => index + 1),
				extractDecided: false,
			};
		}
		case "extractToggled":
			return withExtract(state, event.extract);
		case "extractAsked":
			return { ...state, step: "extractOrGenerate" };
		case "extractChosen":
			return { ...withExtract(state, event.extract), extractDecided: true };
		case "generationStarted":
			return {
				...state,
				step: "main",
				confirm: null,
				generation: { status: "generating" },
				checked: [],
			};
		case "generationSucceeded":
			return {
				...state,
				step: "main",
				generation: {
					status: "done",
					questions: event.result.questions,
					discarded: event.result.discarded,
					requested:
						state.options.format === "extract" ? null : state.options.count,
				},
				checked: [],
			};
		case "generationFailed":
			return {
				...state,
				step: "main",
				generation: { status: "failed", message: event.message },
			};
		case "questionToggled":
			return {
				...state,
				checked: state.checked.includes(event.id)
					? state.checked.filter((id) => id !== event.id)
					: [...state.checked, event.id],
			};
		case "layoutChanged":
			return { ...state, layout: event.layout };
		case "confirmAsked":
			return { ...state, confirm: event.confirm };
		case "confirmCancelled":
			return { ...state, confirm: null };
		case "closeRequested":
			return pendingQuestionCount(state) > 0
				? { ...state, confirm: "close" }
				: { ...state, closing: true };
		case "backRequested":
			switch (state.step) {
				case "extractOrGenerate":
					return { ...state, step: "pdfPages" };
				case "pdfPages":
					return { ...state, step: "pdfUpload" };
				case "pdfUpload":
					return { ...state, step: "main" };
				default:
					return state;
			}
	}
}

/** The created questions still in the assistant, not added (RN-21). */
export function pendingQuestionCount(state: AssistantState): number {
	return state.generation.status === "done"
		? state.generation.questions.length
		: 0;
}

/** The checked questions, in the grid's order (RN-26). */
export function checkedQuestions(
	state: AssistantState,
): GeneratedQuestionData[] {
	return state.generation.status === "done"
		? state.generation.questions.filter(({ id }) => state.checked.includes(id))
		: [];
}

/** What "Crie" does now (RN-15, RN-16, RN-23). */
export function createIntent(
	state: AssistantState,
	{ confirmed = false }: { confirmed?: boolean } = {},
): CreateIntent {
	let source: GenerationRequest["source"];
	if (state.source === "topic") {
		const text = state.topic.trim();
		if (text === "") {
			return { kind: "none" };
		}
		source = { kind: "topic", text };
	} else {
		if (!state.pdf || state.pages.length === 0) {
			return { kind: "none" };
		}
		source = { kind: "pdf", key: state.pdf.key, pages: [...state.pages] };
	}
	if (!confirmed && state.checked.length > 0) {
		return { kind: "confirmReplace" };
	}
	if (
		state.source === "pdf" &&
		state.options.format !== "extract" &&
		!state.extractDecided &&
		looksLikeQuestionList(
			state.pages.map((page) => state.pdf?.pageTexts[page - 1] ?? ""),
		)
	) {
		return { kind: "askExtract" };
	}
	return { kind: "generate", request: { source, options: state.options } };
}
