import { type Accuracy, compareAccuracy, isLowAccuracy } from "./accuracy";
import { playedQuestionCount, type ReportHeader } from "./report";
import type {
	ReportAnswer,
	ReportGame,
	ReportParticipant,
} from "./report-game";

/**
 * How many questions count for a participant: the played ones from the first
 * they could answer. What came before a late player's arrival is not theirs,
 * neither as a mistake nor as unanswered (spec 015, RN-10).
 */
export function questionsOf(
	participant: Pick<ReportParticipant, "firstQuestionIndex">,
	played: number,
): number {
	return Math.max(0, played - participant.firstQuestionIndex);
}

export interface ParticipantStats {
	playerId: string;
	nickname: string;
	/** 1-based, by total; ties by arrival, as in the game (RN-20). */
	rank: number;
	total: number;
	/** Right answers out of their questions (RN-13). */
	accuracy: Accuracy;
	/** Their questions without an answer (RN-12). */
	unanswered: number;
}

/** The answers that count: to played questions the player could answer. */
function countedAnswers(game: ReportGame): Map<string, ReportAnswer[]> {
	const played = playedQuestionCount(game.header);
	const firstOf = new Map(
		game.participants.map((p) => [p.id, p.firstQuestionIndex]),
	);
	const byPlayer = new Map<string, ReportAnswer[]>();
	for (const answer of game.answers) {
		const first = firstOf.get(answer.playerId);
		if (
			first === undefined ||
			answer.questionIndex < first ||
			answer.questionIndex >= played
		) {
			continue;
		}
		const answers = byPlayer.get(answer.playerId) ?? [];
		answers.push(answer);
		byPlayer.set(answer.playerId, answers);
	}
	return byPlayer;
}

/** Every participant with their numbers, the first of the game first. */
export function participantStats(game: ReportGame): ParticipantStats[] {
	const played = playedQuestionCount(game.header);
	const answersOf = countedAnswers(game);

	return game.participants
		.map((participant, arrival) => {
			const answers = answersOf.get(participant.id) ?? [];
			const questions = questionsOf(participant, played);
			return {
				playerId: participant.id,
				nickname: participant.nickname,
				total: answers.reduce((sum, answer) => sum + answer.points, 0),
				accuracy: {
					// A partially correct answer is not a right one (RN-11).
					correct: answers.filter((a) => a.correctness === "correct").length,
					total: questions,
				},
				unanswered: questions - answers.length,
				arrival,
			};
		})
		.sort((a, b) => b.total - a.total || a.arrival - b.arrival)
		.map(({ arrival: _arrival, ...stats }, index) => ({
			...stats,
			rank: index + 1,
		}));
}

/**
 * The whole game's accuracy: right answers over the possible ones, which are
 * each participant's questions added up (RN-15). It takes the least it needs,
 * so the list works it out without reading the answers one by one.
 */
export function overallAccuracy(
	participants: readonly Pick<ReportParticipant, "firstQuestionIndex">[],
	played: number,
	correctAnswers: number,
): Accuracy {
	return {
		correct: correctAnswers,
		total: participants.reduce(
			(sum, participant) => sum + questionsOf(participant, played),
			0,
		),
	};
}

/** Who got less than 35% of their questions right, the lowest first (RN-18). */
export function needsHelp(
	stats: readonly ParticipantStats[],
): ParticipantStats[] {
	return stats
		.filter(({ accuracy }) => isLowAccuracy(accuracy))
		.sort((a, b) => compareAccuracy(a.accuracy, b.accuracy) || a.rank - b.rank);
}

/** Who left a question unanswered, who left the most first (RN-19). */
export function didNotFinish(
	stats: readonly ParticipantStats[],
): ParticipantStats[] {
	return stats
		.filter(({ unanswered }) => unanswered > 0)
		.sort((a, b) => b.unanswered - a.unanswered || a.rank - b.rank);
}

export interface QuestionStats {
	index: number;
	/** Who got it right out of who could answer it (RN-14). */
	accuracy: Accuracy;
	unanswered: number;
	/** Of who answered; null when nobody did (RN-21). */
	averageResponseTimeMs: number | null;
	/** In the question's order. */
	choiceCounts: { choiceId: string; count: number }[];
}

/** Every played question with its numbers, in the order they were played. */
export function questionStats(game: ReportGame): QuestionStats[] {
	const played = playedQuestionCount(game.header);
	const firstOf = new Map(
		game.participants.map((p) => [p.id, p.firstQuestionIndex]),
	);

	return game.questions
		.filter((question) => question.index < played)
		.map((question) => {
			const eligible = game.participants.filter(
				(p) => p.firstQuestionIndex <= question.index,
			).length;
			const answers = game.answers.filter((answer) => {
				const first = firstOf.get(answer.playerId);
				return (
					answer.questionIndex === question.index &&
					first !== undefined &&
					first <= question.index
				);
			});
			const time = answers.reduce((sum, a) => sum + a.responseTimeMs, 0);

			return {
				index: question.index,
				accuracy: {
					correct: answers.filter((a) => a.correctness === "correct").length,
					total: eligible,
				},
				unanswered: eligible - answers.length,
				averageResponseTimeMs:
					answers.length > 0 ? Math.round(time / answers.length) : null,
				choiceCounts: question.choices.map((choice) => ({
					choiceId: choice.id,
					count: answers.filter((a) => a.choiceIds.includes(choice.id)).length,
				})),
			};
		});
}

/** The questions less than 35% got right, the hardest first (RN-17). */
export function difficultQuestions(
	stats: readonly QuestionStats[],
): QuestionStats[] {
	return stats
		.filter(({ accuracy }) => isLowAccuracy(accuracy))
		.sort(
			(a, b) => compareAccuracy(a.accuracy, b.accuracy) || a.index - b.index,
		);
}

/** From "Iniciar" to the end (RN-21). */
export function durationMs(
	header: Pick<ReportHeader, "startedAt" | "endedAt">,
): number {
	return Math.max(0, header.endedAt.getTime() - header.startedAt.getTime());
}
