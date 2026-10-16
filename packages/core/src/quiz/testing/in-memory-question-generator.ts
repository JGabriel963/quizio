import type {
	QuestionGenerationRequest,
	QuestionGenerator,
} from "../application/ports/question-generator";
import type { GeneratedDraft } from "../domain/accept-generated";

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

/** Answers with scripted drafts and records every request. */
export class InMemoryQuestionGenerator implements QuestionGenerator {
	readonly requests: QuestionGenerationRequest[] = [];
	#drafts: GeneratedDraft[];
	#failure: Error | null = null;

	constructor(drafts: GeneratedDraft[] = [1, 2, 3].map(aGeneratedDraft)) {
		this.#drafts = drafts;
	}

	respondWith(drafts: GeneratedDraft[]): void {
		this.#drafts = drafts;
	}

	/** The next call throws, as a provider that is down or too slow. */
	failNext(error = new Error("provider unavailable")): void {
		this.#failure = error;
	}

	async generate(
		request: QuestionGenerationRequest,
	): Promise<GeneratedDraft[]> {
		this.requests.push(request);
		const failure = this.#failure;
		if (failure) {
			this.#failure = null;
			throw failure;
		}
		return JSON.parse(JSON.stringify(this.#drafts));
	}
}
