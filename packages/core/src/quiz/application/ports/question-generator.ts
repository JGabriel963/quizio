import type { GeneratedDraft } from "../../domain/accept-generated";
import type { TokenUsage } from "../../domain/generation-credits";

export type { GeneratedDraft };

/** What the model is given (spec 027). */
export interface QuestionGenerationRequest {
	/** Instructions built by `generationBrief`; the adapter only adds the output format. */
	brief: string;
	source:
		| { kind: "topic"; text: string }
		| { kind: "pdf"; document: Uint8Array };
	/** The most the model may write for this creation (spec 045, RN-07). */
	maxOutputTokens: number;
}

/** What the model returned, and what the provider says it used (spec 045, RN-01). */
export interface QuestionGeneration {
	drafts: GeneratedDraft[];
	/** Null when the provider did not tell. */
	usage: TokenUsage | null;
}

/**
 * A language model that writes quiz questions (ADR 0012). Its answer is never
 * trusted: the core keeps only what fits the editor's rules.
 */
export interface QuestionGenerator {
	/**
	 * Throws `GenerationNotChargedError` when the provider gave no answer at
	 * all, and `GenerationChargedError` when it answered (or may have) without
	 * usable questions.
	 */
	generate(request: QuestionGenerationRequest): Promise<QuestionGeneration>;
}

/**
 * The provider gave no answer (unreachable, rate limited, the key or the
 * request refused, a failure on its side), so nothing was charged and the
 * credits go back (spec 045, RN-10).
 */
export class GenerationNotChargedError extends Error {
	constructor(message: string, options?: { cause?: unknown }) {
		super(message, options);
		this.name = "GenerationNotChargedError";
	}
}

/**
 * The provider answered outside the format, or may have worked until the
 * timeout: the creation is charged by `usage`, or by its whole estimate
 * without it (spec 045, RN-10).
 */
export class GenerationChargedError extends Error {
	readonly usage: TokenUsage | null;

	constructor(
		message: string,
		usage: TokenUsage | null,
		options?: { cause?: unknown },
	) {
		super(message, options);
		this.name = "GenerationChargedError";
		this.usage = usage;
	}
}
