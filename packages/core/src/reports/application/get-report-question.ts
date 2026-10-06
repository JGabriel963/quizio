import { ReportNotFoundError } from "../domain/report";
import { participantStats, questionStats } from "../domain/report-stats";
import { loadReport, type ReportReadDeps } from "./load-report";
import {
	type AnswerResult,
	type ChoiceView,
	chosenChoices,
	type ImageUrlResolver,
	imageUrlOf,
	type QuestionRowView,
	questionRow,
} from "./report-view";

/** An answer of the question, with how many chose it (spec 015, RN-44). */
export interface QuestionChoiceView extends ChoiceView {
	id: string;
	count: number;
}

/** What one participant did in the question. */
export interface QuestionParticipantView {
	playerId: string;
	nickname: string;
	result: AnswerResult;
	choices: ChoiceView[];
	points: number;
	responseTimeMs: number | null;
}

export interface QuestionDetailView extends QuestionRowView {
	imageUrl: string | null;
	unanswered: number;
	averageResponseTimeMs: number | null;
	/** As the game showed them. */
	choices: QuestionChoiceView[];
	/** Who could answer it, by the game's standings. */
	participants: QuestionParticipantView[];
}

export type GetReportQuestion = (input: {
	ownerId: string;
	gameId: string;
	questionIndex: number;
}) => Promise<QuestionDetailView>;

export function createGetReportQuestion(
	deps: ReportReadDeps & { storage: ImageUrlResolver },
): GetReportQuestion {
	return async ({ questionIndex, ...input }) => {
		const game = await loadReport(deps, input);
		const question = game.questions.find((q) => q.index === questionIndex);
		const stats = questionStats(game).find((s) => s.index === questionIndex);
		// A question that did not reach its results is not in the report (RN-09).
		if (!question || !stats) {
			throw new ReportNotFoundError("Question not found");
		}
		const firstOf = new Map(
			game.participants.map((p) => [p.id, p.firstQuestionIndex]),
		);
		const answerOf = new Map(
			game.answers
				.filter((answer) => answer.questionIndex === questionIndex)
				.map((answer) => [answer.playerId, answer]),
		);
		const countOf = new Map(
			stats.choiceCounts.map(({ choiceId, count }) => [choiceId, count]),
		);

		return {
			...questionRow(question, stats),
			imageUrl: imageUrlOf(game.header, question.imageKey, deps.storage),
			unanswered: stats.unanswered,
			averageResponseTimeMs: stats.averageResponseTimeMs,
			choices: question.choices.map(({ id, shapeIndex, text, correct }) => ({
				id,
				shapeIndex,
				text,
				correct,
				count: countOf.get(id) ?? 0,
			})),
			participants: participantStats(game)
				.filter(
					({ playerId }) =>
						(firstOf.get(playerId) ?? Number.POSITIVE_INFINITY) <=
						questionIndex,
				)
				.map(({ playerId, nickname }) => {
					const answer = answerOf.get(playerId);
					return {
						playerId,
						nickname,
						result: answer?.correctness ?? "unanswered",
						choices: chosenChoices(question, answer),
						points: answer?.points ?? 0,
						responseTimeMs: answer?.responseTimeMs ?? null,
					};
				}),
		};
	};
}
