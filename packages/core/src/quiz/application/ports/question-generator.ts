import type { GeneratedDraft } from "../../domain/accept-generated";

export type { GeneratedDraft };

/** What the model is given (spec 027). */
export interface QuestionGenerationRequest {
	/** Instructions built by `generationBrief`; the adapter only adds the output format. */
	brief: string;
	source:
		| { kind: "topic"; text: string }
		| { kind: "pdf"; document: Uint8Array };
}

/**
 * A language model that writes quiz questions (ADR 0012). Its answer is never
 * trusted: the core keeps only what fits the editor's rules.
 */
export interface QuestionGenerator {
	/** Throws on a provider failure, a timeout or an answer outside the format. */
	generate(request: QuestionGenerationRequest): Promise<GeneratedDraft[]>;
}
