import type { Clock } from "../../shared/application/ports/clock";
import type { IdGenerator } from "../../shared/application/ports/id-generator";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { isSourceKeyOwnedBy } from "../../shared/domain/media-key";
import { acceptGeneratedQuestions } from "../domain/accept-generated";
import {
	GENERATION_QUOTA_WINDOW_MS,
	GenerationFailedError,
	type GenerationOptionsInput,
	GenerationQuotaExceededError,
	type GenerationSourceKind,
	GenerationUnavailableError,
	parseGenerationOptions,
	parseSourcePages,
	parseTopicText,
	SourceNotFoundError,
} from "../domain/generation";
import { generationBrief } from "../domain/generation-brief";
import { loadEditableQuiz } from "./editable-quiz";
import type { AssistantSettings } from "./get-assistant-status";
import type { AssistantPreferencesRepository } from "./ports/assistant-preferences-repository";
import type { GenerationQuota } from "./ports/generation-quota";
import type { PdfPages } from "./ports/pdf-pages";
import type {
	QuestionGenerationRequest,
	QuestionGenerator,
} from "./ports/question-generator";
import type { QuestionRepository } from "./ports/question-repository";
import type { QuizRepository } from "./ports/quiz-repository";
import { type QuestionView, toQuestionView } from "./quiz-editor-view";
import type { QuizReference } from "./quiz-reference";

export type GenerationSourceInput =
	| { kind: "topic"; text: string }
	| { kind: "pdf"; key: string; pages: number[] };

export interface GenerateQuestionsInput extends QuizReference {
	source: GenerationSourceInput;
	options: GenerationOptionsInput;
}

export interface GenerateQuestionsOutput {
	/** Not in the quiz yet: they stay in the assistant until added (RN-21). */
	questions: QuestionView[];
	/** What the model returned that broke the rules (RN-20, RN-22). */
	discarded: number;
	remaining: number;
}

export type GenerateQuestions = (
	input: GenerateQuestionsInput,
) => Promise<GenerateQuestionsOutput>;

/**
 * Asks the model for questions about a topic or the chosen pages of a PDF
 * (spec 027). Everything the creator sent is checked before a generation is
 * spent; a failed call gives it back (RN-31, RN-33).
 */
export function createGenerateQuestions(deps: {
	quizzes: QuizRepository;
	questions: QuestionRepository;
	questionGenerator: QuestionGenerator | null;
	generationQuota: GenerationQuota;
	assistantPreferences: AssistantPreferencesRepository;
	assistantSettings: AssistantSettings;
	storage: Pick<ObjectStorage, "read">;
	pdfPages: PdfPages;
	ids: IdGenerator;
	clock: Clock;
}): GenerateQuestions {
	async function sourceFor(
		ownerId: string,
		input: GenerationSourceInput,
	): Promise<QuestionGenerationRequest["source"]> {
		if (input.kind === "topic") {
			return { kind: "topic", text: parseTopicText(input.text) };
		}
		const pages = parseSourcePages(input.pages);
		if (!isSourceKeyOwnedBy(input.key, ownerId)) {
			throw new SourceNotFoundError("Source document not found");
		}
		const document = await deps.storage.read(input.key);
		if (!document) {
			throw new SourceNotFoundError("Source document not found");
		}
		return {
			kind: "pdf",
			document: await deps.pdfPages.select(document, pages),
		};
	}

	return async ({ ownerId, quizId, source, options: rawOptions }) => {
		const generator = deps.questionGenerator;
		if (!generator) {
			throw new GenerationUnavailableError("No AI provider is configured");
		}
		await loadEditableQuiz(deps, { ownerId, quizId });
		const sourceKind: GenerationSourceKind = source.kind;
		const options = parseGenerationOptions(rawOptions, sourceKind);
		const request: QuestionGenerationRequest = {
			brief: generationBrief(options, sourceKind),
			source: await sourceFor(ownerId, source),
		};

		const limit = deps.assistantSettings.generationsPerDay;
		const reservation = await deps.generationQuota.reserve(
			ownerId,
			limit,
			GENERATION_QUOTA_WINDOW_MS,
			deps.clock.now(),
		);
		if (!reservation.reserved) {
			throw new GenerationQuotaExceededError(
				`At most ${limit} generations every 24 hours`,
			);
		}

		let drafts: Awaited<ReturnType<QuestionGenerator["generate"]>>;
		try {
			drafts = await generator.generate(request);
		} catch (error) {
			await deps.generationQuota.release(reservation.id);
			throw new GenerationFailedError(
				`The questions could not be created: ${String(error)}`,
			);
		}

		const { questions, discarded } = acceptGeneratedQuestions(
			drafts,
			options,
			() => deps.ids.generate(),
		);
		if (options.format !== "extract") {
			await deps.assistantPreferences.save(ownerId, options);
		}
		const { used } = await deps.generationQuota.usage(
			ownerId,
			GENERATION_QUOTA_WINDOW_MS,
			deps.clock.now(),
		);
		return {
			questions: questions.map(toQuestionView),
			discarded,
			remaining: Math.max(0, limit - used),
		};
	};
}
