import { accuracyPercent } from "../domain/accuracy";
import { endedEarly, playedQuestionCount } from "../domain/report";
import {
	didNotFinish,
	difficultQuestions,
	durationMs,
	needsHelp,
	overallAccuracy,
	participantStats,
	questionStats,
} from "../domain/report-stats";
import { loadReport, type ReportReadDeps } from "./load-report";
import {
	coverUrlOf,
	type ImageUrlResolver,
	imageUrlOf,
	type ParticipantRowView,
	participantRow,
	type QuestionRowView,
	questionRow,
	quizLinksOf,
} from "./report-view";

/** The top of a report (spec 015, RN-32, RN-33). */
export interface ReportHeaderView {
	gameId: string;
	name: string;
	coverUrl: string | null;
	startedAt: Date;
	endedAt: Date;
	endedEarly: boolean;
	/** How many questions the game had. */
	questionCount: number;
	/** How many reached their results (RN-09). */
	playedCount: number;
	participantCount: number;
	/** Null when the quiz cannot be opened (RN-05). */
	quizId: string | null;
	canPlayAgain: boolean;
}

/** The hardest question, as its card shows it (RN-37). */
export interface HardestQuestionView extends QuestionRowView {
	imageUrl: string | null;
	averageResponseTimeMs: number | null;
}

export interface ReportSummaryView {
	/** Null when no question reached its results. */
	accuracyPercent: number | null;
	durationMs: number;
	hardestQuestion: HardestQuestionView | null;
	difficultCount: number;
	/** Lowest accuracy first (RN-38). */
	needsHelp: ParticipantRowView[];
	/** Who left the most unanswered first (RN-39). */
	didNotFinish: ParticipantRowView[];
}

/**
 * A report without its answers one by one: the details have their own
 * queries, so a game of 200 players does not send thousands of lines at once.
 */
export interface ReportView {
	header: ReportHeaderView;
	summary: ReportSummaryView;
	/** By rank (RN-40). */
	participants: ParticipantRowView[];
	/** In the order they were played (RN-43). */
	questions: QuestionRowView[];
}

export type GetReport = (input: {
	ownerId: string;
	gameId: string;
}) => Promise<ReportView>;

export function createGetReport(
	deps: ReportReadDeps & { storage: ImageUrlResolver },
): GetReport {
	return async (input) => {
		const game = await loadReport(deps, input);
		const { header } = game;
		const played = playedQuestionCount(header);
		const participants = participantStats(game);
		const questions = questionStats(game);
		const questionOf = new Map(game.questions.map((q) => [q.index, q]));
		const difficult = difficultQuestions(questions);
		const [hardest] = difficult;
		const hardestQuestion = hardest && questionOf.get(hardest.index);

		return {
			header: {
				gameId: header.gameId,
				name: header.name,
				coverUrl: coverUrlOf(header, deps.storage),
				startedAt: header.startedAt,
				endedAt: header.endedAt,
				endedEarly: endedEarly(header),
				questionCount: header.questionCount,
				playedCount: played,
				participantCount: game.participants.length,
				...quizLinksOf(header),
			},
			summary: {
				accuracyPercent: accuracyPercent(
					overallAccuracy(
						game.participants,
						played,
						participants.reduce((sum, p) => sum + p.accuracy.correct, 0),
					),
				),
				durationMs: durationMs(header),
				hardestQuestion:
					hardest && hardestQuestion
						? {
								...questionRow(hardestQuestion, hardest),
								imageUrl: imageUrlOf(
									header,
									hardestQuestion.imageKey,
									deps.storage,
								),
								averageResponseTimeMs: hardest.averageResponseTimeMs,
							}
						: null,
				difficultCount: difficult.length,
				needsHelp: needsHelp(participants).map(participantRow),
				didNotFinish: didNotFinish(participants).map(participantRow),
			},
			participants: participants.map(participantRow),
			questions: questions.flatMap((stats) => {
				const question = questionOf.get(stats.index);
				return question ? [questionRow(question, stats)] : [];
			}),
		};
	};
}
