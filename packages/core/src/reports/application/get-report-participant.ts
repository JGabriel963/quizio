import type { QuestionType } from "../../quiz/domain/question";
import type { TextFormatting } from "../../shared/domain/text-formatting";
import { puzzleOrderOf } from "../domain/puzzle-orders";
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
	/** The statement's marked stretches (spec 047, RN-25). */
	textFormatting: TextFormatting;
	type: QuestionType;
	result: AnswerResult;
	/** What they marked; empty without an answer. */
	choices: ChoiceView[];
	/** What they typed in a type answer (spec 031, RN-37); null otherwise. */
	typedText: string | null;
	/** What they picked on a slider (spec 032, RN-36); null otherwise. */
	sliderValue: number | null;
	/** The slider's unit, told with the value ("600 anos"); null otherwise. */
	sliderUnit: string | null;
	/** The order they sent in a puzzle, by text (spec 033, RN-31); null otherwise. */
	puzzleOrder: string[] | null;
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
						textFormatting: question.textFormatting,
						type: question.type,
						result: answer?.correctness ?? "unanswered",
						choices: chosenChoices(question, answer),
						typedText: answer?.text ?? null,
						sliderValue: answer?.value ?? null,
						sliderUnit: question.slider?.unit ?? null,
						puzzleOrder: puzzleOrderOf(question, answer),
						points: answer?.points ?? 0,
						responseTimeMs: answer?.responseTimeMs ?? null,
					};
				}),
		};
	};
}
