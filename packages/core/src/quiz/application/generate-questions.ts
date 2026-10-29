import type { Clock } from "../../shared/application/ports/clock";
import type { IdGenerator } from "../../shared/application/ports/id-generator";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { isSourceKeyOwnedBy } from "../../shared/domain/media-key";
import { acceptGeneratedQuestions } from "../domain/accept-generated";
import {
	GENERATION_QUOTA_WINDOW_MS,
	GenerationFailedError,
	GenerationInstanceLimitError,
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
import {
	estimateGeneration,
	type GenerationSize,
	settleCharge,
} from "../domain/generation-credits";
import { loadEditableQuiz } from "./editable-quiz";
import type { AssistantSettings } from "./get-assistant-status";
import type { AssistantPreferencesRepository } from "./ports/assistant-preferences-repository";
import type { GenerationQuota } from "./ports/generation-quota";
import type { PdfPages } from "./ports/pdf-pages";
import {
	GenerationChargedError,
	GenerationNotChargedError,
	type QuestionGeneration,
	type QuestionGenerationRequest,
	type QuestionGenerator,
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
	/** Credits left to the creator (spec 045, RN-16). */
	remaining: number;
	/** What this creation was charged (spec 045, RN-09). */
	creditsUsed: number;
}

export type GenerateQuestions = (
	input: GenerateQuestionsInput,
) => Promise<GenerateQuestionsOutput>;

type CheckedSource =
	| { kind: "topic"; text: string }
	| { kind: "pdf"; key: string; pages: number[] };

/**
 * Asks the model for questions about a topic or the chosen pages of a PDF
 * (spec 027). The estimate is reserved before the PDF is even read, so a
 * creator (or the instance) without the credits cannot make the server open
 * files; once the provider answered the creation is settled with what it cost
 * (spec 045). A PDF that turns out to be invalid, or a call the provider did
 * not charge, gives the credits back.
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
	/** What can be checked without reading anything. */
	function checkedSource(
		ownerId: string,
		input: GenerationSourceInput,
	): CheckedSource {
		if (input.kind === "topic") {
			return { kind: "topic", text: parseTopicText(input.text) };
		}
		const pages = parseSourcePages(input.pages);
		if (!isSourceKeyOwnedBy(input.key, ownerId)) {
			throw new SourceNotFoundError("Source document not found");
		}
		return { kind: "pdf", key: input.key, pages };
	}

	async function sourceFor(
		source: CheckedSource,
	): Promise<QuestionGenerationRequest["source"]> {
		if (source.kind === "topic") {
			return source;
		}
		const document = await deps.storage.read(source.key);
		if (!document) {
			throw new SourceNotFoundError("Source document not found");
		}
		return {
			kind: "pdf",
			document: await deps.pdfPages.select(document, source.pages),
		};
	}

	/** Takes the estimate from the creator's budget and the instance's ceiling (RN-08, RN-14). */
	async function reserve(ownerId: string, credits: number) {
		const { creditsPerDay, instanceCreditsPerDay } = deps.assistantSettings;
		const reservation = await deps.generationQuota.reserve(
			ownerId,
			credits,
			{ perOwner: creditsPerDay, instance: instanceCreditsPerDay },
			GENERATION_QUOTA_WINDOW_MS,
			deps.clock.now(),
		);
		if (reservation.reserved) {
			return reservation.id;
		}
		if (reservation.limitedBy === "instance") {
			throw new GenerationInstanceLimitError(
				`The instance allows ${instanceCreditsPerDay} credits every 24 hours`,
			);
		}
		throw new GenerationQuotaExceededError(
			`${credits} credits do not fit the ${creditsPerDay} of every 24 hours`,
		);
	}

	return async ({ ownerId, quizId, source, options: rawOptions }) => {
		const generator = deps.questionGenerator;
		if (!generator) {
			throw new GenerationUnavailableError("No AI provider is configured");
		}
		await loadEditableQuiz(deps, { ownerId, quizId });
		const sourceKind: GenerationSourceKind = source.kind;
		const options = parseGenerationOptions(rawOptions, sourceKind);
		const checked = checkedSource(ownerId, source);
		const { pricing } = deps.assistantSettings;
		const estimate = estimateGeneration(sizeOf(checked), options, pricing);

		const reservationId = await reserve(ownerId, estimate.credits);
		let request: QuestionGenerationRequest;
		try {
			request = {
				brief: generationBrief(options, sourceKind),
				source: await sourceFor(checked),
				maxOutputTokens: estimate.maxOutputTokens,
			};
		} catch (error) {
			await deps.generationQuota.release(reservationId);
			throw error;
		}

		let generation: QuestionGeneration;
		try {
			generation = await generator.generate(request);
		} catch (error) {
			if (error instanceof GenerationNotChargedError) {
				await deps.generationQuota.release(reservationId);
			} else {
				const usage =
					error instanceof GenerationChargedError ? error.usage : null;
				await deps.generationQuota.settle(
					reservationId,
					settleCharge(estimate, usage, pricing),
				);
			}
			// The provider's answer may name the model, the account or the key.
			throw new GenerationFailedError("The questions could not be created", {
				cause: error,
			});
		}
		const charge = settleCharge(estimate, generation.usage, pricing);
		await deps.generationQuota.settle(reservationId, charge);
		const { drafts } = generation;

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
			remaining: Math.max(0, deps.assistantSettings.creditsPerDay - used),
			creditsUsed: charge.charged,
		};
	};
}

/** What the estimate knows of the source before it is read (RN-06). */
function sizeOf(source: CheckedSource): GenerationSize {
	return source.kind === "topic"
		? { kind: "topic", characters: source.text.length }
		: { kind: "pdf", pages: source.pages.length };
}
