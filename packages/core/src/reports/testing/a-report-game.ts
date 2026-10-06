import type { Correctness } from "../../game/domain/answer";
import type { ReportHeader } from "../domain/report";
import type {
	ReportAnswer,
	ReportGame,
	ReportParticipant,
	ReportQuestion,
} from "../domain/report-game";

/** Test builder: the report of game-1, of quiz-1, played to the podium by user-1. */
export function aReportHeader(
	overrides: Partial<ReportHeader> = {},
): ReportHeader {
	return {
		gameId: "game-1",
		ownerId: "user-1",
		name: "Capitais",
		quizId: "quiz-1",
		quiz: { trashed: false, playable: true, coverImageKey: null },
		questionCount: 3,
		outcome: "finished",
		stoppedAt: null,
		startedAt: new Date("2026-06-13T17:45:00.000Z"),
		endedAt: new Date("2026-06-13T17:56:00.000Z"),
		trashedAt: null,
		...overrides,
	};
}

/** Test builder: a Quiz question of four answers, the first one right. */
export function aReportQuestion(
	index: number,
	overrides: Partial<ReportQuestion> = {},
): ReportQuestion {
	return {
		index,
		type: "quiz",
		text: `Pergunta ${index + 1}`,
		imageKey: null,
		choices: ["a", "b", "c", "d"].map((letter, shapeIndex) => ({
			id: `q${index}-${letter}`,
			shapeIndex,
			text: `Resposta ${letter.toUpperCase()}`,
			correct: shapeIndex === 0,
		})),
		...overrides,
	};
}

/**
 * What a player did in a question: the first right answer in 2 s for 1000
 * points, the first wrong one for nothing, half the points for a partially
 * correct one, nothing at all (`null`), or the answer spelled out.
 */
export type AnswerSpec =
	| "right"
	| "wrong"
	| "partial"
	| null
	| {
			choiceIds: string[];
			correctness: Correctness;
			points?: number;
			responseTimeMs?: number;
	  };

function answerOf(
	spec: Exclude<AnswerSpec, null>,
	question: ReportQuestion,
	playerId: string,
): ReportAnswer {
	const base = { questionIndex: question.index, playerId };
	if (typeof spec !== "string") {
		return {
			...base,
			choiceIds: spec.choiceIds,
			correctness: spec.correctness,
			points: spec.points ?? (spec.correctness === "correct" ? 1000 : 0),
			responseTimeMs: spec.responseTimeMs ?? 2000,
		};
	}
	const right = question.choices.find((choice) => choice.correct);
	const wrong = question.choices.find((choice) => !choice.correct);
	const choice = spec === "wrong" ? wrong : right;
	return {
		...base,
		choiceIds: choice ? [choice.id] : [],
		correctness:
			spec === "right"
				? "correct"
				: spec === "partial"
					? "partiallyCorrect"
					: "wrong",
		points: spec === "right" ? 1000 : spec === "partial" ? 500 : 0,
		responseTimeMs: 2000,
	};
}

/**
 * Test builder: a game as a report reads it. Players come in order of
 * arrival, with the id `player-{nickname}`; `answers` has, per nickname, what
 * the player did in each question, by the question's index. The header is of
 * a game that played every question unless it says otherwise.
 */
export function aReportGame(input: {
	header?: Partial<ReportHeader>;
	questions: number | ReportQuestion[];
	players: (string | (Partial<ReportParticipant> & { nickname: string }))[];
	answers?: Record<string, AnswerSpec[]>;
}): ReportGame {
	const questions =
		typeof input.questions === "number"
			? Array.from({ length: input.questions }, (_, index) =>
					aReportQuestion(index),
				)
			: input.questions;
	const startedAt =
		input.header?.startedAt ?? new Date("2026-06-13T17:45:00.000Z");
	const participants = input.players.map((player, arrival) => {
		const given = typeof player === "string" ? { nickname: player } : player;
		return {
			id: `player-${given.nickname}`,
			firstQuestionIndex: 0,
			joinedAt: new Date(startedAt.getTime() - 60_000 + arrival * 1000),
			...given,
		};
	});
	const answers = participants.flatMap((participant) =>
		(input.answers?.[participant.nickname] ?? []).flatMap((spec, index) => {
			const question = questions[index];
			return spec === null || !question
				? []
				: [answerOf(spec, question, participant.id)];
		}),
	);

	return {
		header: aReportHeader({
			questionCount: questions.length,
			...input.header,
		}),
		participants,
		questions,
		answers,
	};
}
