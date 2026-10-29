import type {
	QuestionGeneration,
	QuestionGenerationRequest,
	QuestionGenerator,
} from "../application/ports/question-generator";
import type { GeneratedDraft } from "../domain/accept-generated";
import type { TokenUsage } from "../domain/generation-credits";

/** A quiz question about the solar system, valid for every rule. */
export function aGeneratedDraft(index = 1): GeneratedDraft {
	return {
		type: "quiz",
		text: `Pergunta ${index} sobre o sistema solar?`,
		choices: [
			{ text: "Mercúrio", correct: false },
			{ text: "Júpiter", correct: true },
			{ text: "Marte", correct: false },
			{ text: "Vênus", correct: false },
		],
	};
}

/** What a short creation uses: 1 credit with the default weights (spec 045, RN-01). */
export const TYPICAL_USAGE: TokenUsage = {
	inputTokens: 1500,
	outputTokens: 2500,
};

/** Answers with scripted drafts and records every request. */
export class InMemoryQuestionGenerator implements QuestionGenerator {
	readonly requests: QuestionGenerationRequest[] = [];
	#drafts: GeneratedDraft[];
	#usage: TokenUsage | null = TYPICAL_USAGE;
	#failure: Error | null = null;

	constructor(drafts: GeneratedDraft[] = [1, 2, 3].map(aGeneratedDraft)) {
		this.#drafts = drafts;
	}

	respondWith(
		drafts: GeneratedDraft[],
		usage: TokenUsage | null = TYPICAL_USAGE,
	): void {
		this.#drafts = drafts;
		this.#usage = usage;
	}

	/** The next call throws, as a provider that is down or too slow. */
	failNext(error: Error = new Error("provider unavailable")): void {
		this.#failure = error;
	}

	async generate(
		request: QuestionGenerationRequest,
	): Promise<QuestionGeneration> {
		this.requests.push(request);
		const failure = this.#failure;
		if (failure) {
			this.#failure = null;
			throw failure;
		}
		return {
			drafts: JSON.parse(JSON.stringify(this.#drafts)),
			usage: this.#usage && { ...this.#usage },
		};
	}
}
