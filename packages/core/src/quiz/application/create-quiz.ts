import type { Clock } from "../../shared/application/ports/clock";
import type { IdGenerator } from "../../shared/application/ports/id-generator";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { blankQuestion } from "../domain/question";
import {
	type QuestionDraft,
	questionFromDraft,
} from "../domain/question-draft";
import { newQuiz, type QuizThemeChoice } from "../domain/quiz";
import { parseQuizDetails } from "../domain/quiz-details";
import { assertUsableCover } from "./assert-usable-cover";
import type { CustomThemeReads } from "./ports/custom-theme-reads";
import type { QuestionRepository } from "./ports/question-repository";
import type { QuizRepository } from "./ports/quiz-repository";
import { assertUsableImages } from "./question-images";
import { type QuizDetailsView, toQuizDetailsView } from "./quiz-details-view";
import { resolveThemeChoice } from "./theme-choice";

export interface CreateQuizInput {
	ownerId: string;
	title?: string | null;
	description?: string | null;
	visibility?: string;
	/** Key returned by a media upload the browser already completed. */
	coverImageKey?: string | null;
	/** The theme it starts with; the default one when missing (spec 044, RN-20). */
	theme?: QuizThemeChoice;
	/**
	 * Only an AI agent sends them (spec 044, RN-20, RN-22): the quiz starts with
	 * these questions, all made with AI, instead of the blank one.
	 */
	questions?: QuestionDraft[];
}

export type CreateQuiz = (input: CreateQuizInput) => Promise<QuizDetailsView>;

export function createCreateQuiz(deps: {
	quizzes: QuizRepository;
	questions: QuestionRepository;
	storage: ObjectStorage;
	customThemes: CustomThemeReads;
	ids: IdGenerator;
	clock: Clock;
}): CreateQuiz {
	return async ({
		ownerId,
		coverImageKey = null,
		theme,
		questions: drafts = [],
		...rawDetails
	}) => {
		// Everything is checked before anything is written.
		const details = parseQuizDetails(rawDetails);
		if (coverImageKey) {
			await assertUsableCover(deps.storage, coverImageKey, ownerId);
		}
		const themeChoice = theme
			? await resolveThemeChoice(deps.customThemes, ownerId, theme)
			: null;
		const quizId = deps.ids.generate();
		const questions =
			drafts.length > 0
				? drafts.map((draft) => questionFromDraft(draft, deps.ids.generate()))
				: // Every quiz starts with a blank question to fill in (spec 003, RN-04).
					[blankQuestion(deps.ids.generate())];
		await assertUsableImages(deps.storage, questions, ownerId);

		const quiz = {
			...newQuiz({
				id: quizId,
				ownerId,
				details,
				coverImageKey,
				now: deps.clock.now(),
			}),
			...themeChoice,
		};
		await deps.quizzes.save(quiz);
		await deps.questions.saveList(quiz.id, questions);

		return toQuizDetailsView(quiz, deps.storage, questions.length);
	};
}
