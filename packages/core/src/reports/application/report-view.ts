import type { Correctness } from "../../game/domain/answer";
import type { QuestionType } from "../../quiz/domain/question";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { accuracyPercent, isLowAccuracy } from "../domain/accuracy";
import { canPlayAgain, canViewQuiz, type ReportHeader } from "../domain/report";
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
	return question.choices
		.filter((choice) => answer?.choiceIds.includes(choice.id))
		.map(({ shapeIndex, text, correct }) => ({ shapeIndex, text, correct }));
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

/** The quiz's id while it can be opened (RN-05), and whether it can be played. */
export function quizLinksOf(header: ReportHeader): {
	quizId: string | null;
	canPlayAgain: boolean;
} {
	return {
		quizId: canViewQuiz(header) ? header.quizId : null,
		canPlayAgain: canPlayAgain(header),
	};
}

export type { ReportGame };
