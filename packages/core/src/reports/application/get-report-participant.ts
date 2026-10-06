import type { QuestionType } from "../../quiz/domain/question";
import { ReportNotFoundError } from "../domain/report";
import { participantStats } from "../domain/report-stats";
import { loadReport, type ReportReadDeps } from "./load-report";
import {
	type AnswerResult,
	type ChoiceView,
	chosenChoices,
	type ParticipantRowView,
	participantRow,
} from "./report-view";

/** What a participant did in one of their questions (spec 015, RN-42). */
export interface ParticipantAnswerView {
	questionIndex: number;
	text: string;
	type: QuestionType;
	result: AnswerResult;
	/** What they marked; empty without an answer. */
	choices: ChoiceView[];
	points: number;
	/** Null without an answer. */
	responseTimeMs: number | null;
}

export interface ParticipantDetailView extends ParticipantRowView {
	/** Only their questions, in the order they were played (RN-10). */
	answers: ParticipantAnswerView[];
}

export type GetReportParticipant = (input: {
	ownerId: string;
	gameId: string;
	playerId: string;
}) => Promise<ParticipantDetailView>;

export function createGetReportParticipant(
	deps: ReportReadDeps,
): GetReportParticipant {
	return async ({ playerId, ...input }) => {
		const game = await loadReport(deps, input);
		const participant = game.participants.find(({ id }) => id === playerId);
		const stats = participantStats(game).find((s) => s.playerId === playerId);
		if (!participant || !stats) {
			throw new ReportNotFoundError("Participant not found");
		}
		const answerOf = new Map(
			game.answers
				.filter((answer) => answer.playerId === playerId)
				.map((answer) => [answer.questionIndex, answer]),
		);

		return {
			...participantRow(stats),
			answers: game.questions
				.filter(({ index }) => index >= participant.firstQuestionIndex)
				.map((question) => {
					const answer = answerOf.get(question.index);
					return {
						questionIndex: question.index,
						text: question.text,
						type: question.type,
						result: answer?.correctness ?? "unanswered",
						choices: chosenChoices(question, answer),
						points: answer?.points ?? 0,
						responseTimeMs: answer?.responseTimeMs ?? null,
					};
				}),
		};
	};
}
