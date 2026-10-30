import type { Correctness } from "../../game/domain/answer";
import type { QuestionType } from "../../quiz/domain/question";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import type { QuizShareGrants } from "../../shared/application/ports/quiz-share-grants";
import { marginRange } from "../../shared/domain/slider-scale";
import type { TextFormatting } from "../../shared/domain/text-formatting";
import { groupTypedAnswers } from "../../shared/domain/typed-answer";
import { accuracyPercent, isLowAccuracy } from "../domain/accuracy";
import {
	canPlayAgain,
	canViewQuiz,
	isOpenAssignment,
	type ReportHeader,
} from "../domain/report";
import type {
	ReportAnswer,
	ReportGame,
	ReportQuestion,
} from "../domain/report-game";
import type { ParticipantStats, QuestionStats } from "../domain/report-stats";

export type ImageUrlResolver = Pick<ObjectStorage, "getPublicUrl">;

/** What a participant did in a question. */
export type AnswerResult = Correctness | "unanswered";

/** One line of the participants' table (spec 015, RN-40). */
export interface ParticipantRowView {
	playerId: string;
	nickname: string;
	rank: number;
	total: number;
	/** Null for who had no question. */
	accuracyPercent: number | null;
	unanswered: number;
	needsHelp: boolean;
}

/** One line of the questions' table (RN-43). */
export interface QuestionRowView {
	index: number;
	text: string;
	textFormatting: TextFormatting;
	type: QuestionType;
	accuracyPercent: number | null;
	difficult: boolean;
}

/** An answer as the game showed it. */
export interface ChoiceView {
	shapeIndex: number;
	text: string;
	correct: boolean;
}

export function participantRow(stats: ParticipantStats): ParticipantRowView {
	return {
		playerId: stats.playerId,
		nickname: stats.nickname,
		rank: stats.rank,
		total: stats.total,
		accuracyPercent: accuracyPercent(stats.accuracy),
		unanswered: stats.unanswered,
		needsHelp: isLowAccuracy(stats.accuracy),
	};
}

export function questionRow(
	question: ReportQuestion,
	stats: QuestionStats,
): QuestionRowView {
	return {
		index: question.index,
		text: question.text,
		textFormatting: question.textFormatting,
		type: question.type,
		accuracyPercent: accuracyPercent(stats.accuracy),
		difficult: isLowAccuracy(stats.accuracy),
	};
}

/** The answers a player marked, in the question's order. */
export function chosenChoices(
	question: ReportQuestion,
	answer: ReportAnswer | undefined,
): ChoiceView[] {
	// A puzzle's answer is its order (`puzzleOrderOf`), not marked answers (spec 033).
	if (question.type === "puzzle") {
		return [];
	}
	return question.choices
		.filter((choice) => answer?.choiceIds.includes(choice.id))
		.map(({ shapeIndex, text, correct }) => ({ shapeIndex, text, correct }));
}

/** What was typed in a type answer, grouped as the game grouped it (spec 031, RN-37). */
export interface TypedAnswerView {
	text: string;
	count: number;
	correct: boolean;
}

export function typedAnswersOf(
	question: ReportQuestion,
	answers: readonly ReportAnswer[],
): TypedAnswerView[] | null {
	if (question.type !== "typeAnswer") {
		return null;
	}
	return groupTypedAnswers(
		question.acceptedAnswers,
		answers.flatMap((answer) =>
			answer.text === null
				? []
				: [
						{
							text: answer.text,
							correct: answer.correctness === "correct",
							receivedAt: answer.receivedAt,
						},
					],
		),
	).map(({ text, count, correct }) => ({ text, count, correct }));
}

/**
 * Images belong to the quiz (spec 007, RN-36): they are there while it
 * exists, in the trash too, and go with it when it is deleted for good (spec
 * 015, RN-06).
 */
export function imageUrlOf(
	header: ReportHeader,
	key: string | null,
	storage: ImageUrlResolver,
): string | null {
	return header.quiz !== null && key !== null
		? storage.getPublicUrl(key)
		: null;
}

export function coverUrlOf(
	header: ReportHeader,
	storage: ImageUrlResolver,
): string | null {
	return imageUrlOf(header, header.quiz?.coverImageKey ?? null, storage);
}

/** Where a report leads: its quiz's page, and the quiz to play again. */
export interface QuizLinksView {
	/** The quiz's page while it can be opened (RN-05), for its owner only. */
	quizId: string | null;
	canPlayAgain: boolean;
	/**
	 * What "Jogar novamente" hosts: the reader's quiz, or one a group shares
	 * with them (spec 037, RN-24).
	 */
	playQuizId: string | null;
}

export const NO_QUIZ_LINKS: QuizLinksView = {
	quizId: null,
	canPlayAgain: false,
	playQuizId: null,
};

export function quizLinksOf(
	header: ReportHeader,
	viewerId: string,
	sharedWithViewer: boolean,
): QuizLinksView {
	const owned = header.quiz?.ownerId === viewerId;
	const playable = canPlayAgain(header) && (owned || sharedWithViewer);
	return {
		quizId: owned && canViewQuiz(header) ? header.quizId : null,
		canPlayAgain: playable,
		playQuizId: playable ? header.quizId : null,
	};
}

/** Asks the grants only for a playable quiz the reader does not own. */
export async function quizLinksFor(
	grants: QuizShareGrants | undefined,
	header: ReportHeader,
	viewerId: string,
): Promise<QuizLinksView> {
	const shared =
		grants !== undefined &&
		header.quiz !== null &&
		header.quiz.ownerId !== viewerId &&
		canPlayAgain(header) &&
		(await grants.canUse(viewerId, header.quizId));
	return quizLinksOf(header, viewerId, shared);
}

/** What a report of an assignment adds (spec 029, RN-29, RN-31, RN-32). */
export interface AssignmentPartView {
	open: boolean;
	deadline: Date;
	/** Null once it is over; the screens never compare instants with their clock. */
	remainingMs: number | null;
	/** Only while it is open. */
	pin: string | null;
}

export function assignmentPartOf(
	header: ReportHeader,
	now: Date,
): AssignmentPartView | null {
	if (header.mode !== "assignment") {
		return null;
	}
	const open = isOpenAssignment(header);
	return {
		open,
		deadline: header.deadline,
		remainingMs: open
			? Math.max(0, header.deadline.getTime() - now.getTime())
			: null,
		pin: open ? header.pin : null,
	};
}

export type { ReportGame };

/** A slider's answers in its report (spec 032, RN-36). */
export interface SliderAnswersView {
	answer: number;
	unit: string | null;
	low: number;
	high: number;
	/** Of the values sent, to the hundredth; null when nobody answered. */
	average: number | null;
	/** One per value sent, the nearest to the answer first. */
	values: { value: number; count: number; correctness: Correctness }[];
}

export function sliderAnswersOf(
	question: ReportQuestion,
	answers: readonly ReportAnswer[],
): SliderAnswersView | null {
	const { slider } = question;
	if (slider === null) {
		return null;
	}
	const byValue = new Map<
		number,
		{ count: number; correctness: Correctness }
	>();
	let sum = 0;
	let sent = 0;
	for (const { value, correctness } of answers) {
		if (value === null) {
			continue;
		}
		sum += value;
		sent += 1;
		const entry = byValue.get(value);
		byValue.set(value, { count: (entry?.count ?? 0) + 1, correctness });
	}
	const distance = (value: number) => Math.abs(value - slider.answer);
	return {
		answer: slider.answer,
		unit: slider.unit,
		...marginRange(slider),
		average: sent > 0 ? Math.round((sum / sent) * 100) / 100 : null,
		values: [...byValue]
			.map(([value, entry]) => ({ value, ...entry }))
			.sort(
				(a, b) => distance(a.value) - distance(b.value) || a.value - b.value,
			),
	};
}
