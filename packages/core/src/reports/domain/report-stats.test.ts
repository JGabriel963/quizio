import { describe, expect, it } from "vitest";

import { aReportGame, aReportHeader } from "../testing/a-report-game";
import { accuracyPercent } from "./accuracy";
import {
	didNotFinish,
	difficultQuestions,
	durationMs,
	needsHelp,
	overallAccuracy,
	participantStats,
	questionStats,
	questionsOf,
} from "./report-stats";

/** Ana got 3 of 4; Bia got 1, missed 1 and left 2 unanswered (CA-07, CA-08). */
const anaAndBia = () =>
	aReportGame({
		questions: 4,
		players: ["Ana", "Bia"],
		answers: {
			Ana: ["right", "right", "right", "wrong"],
			Bia: ["right", "wrong", null, null],
		},
	});

const byNickname = (game: ReturnType<typeof aReportGame>) =>
	new Map(participantStats(game).map((stats) => [stats.nickname, stats]));

describe("report stats: participants (spec 015)", () => {
	it("overall accuracy is right answers over possible ones", () => {
		const game = anaAndBia();

		const overall = overallAccuracy(game.participants, 4, 4);

		expect(overall).toEqual({ correct: 4, total: 8 });
		expect(accuracyPercent(overall)).toBe(50);
	});

	it("a participant's accuracy and unanswered questions", () => {
		const stats = byNickname(anaAndBia());

		expect(stats.get("Ana")).toMatchObject({
			accuracy: { correct: 3, total: 4 },
			unanswered: 0,
		});
		expect(stats.get("Bia")).toMatchObject({
			accuracy: { correct: 1, total: 4 },
			unanswered: 2,
		});
	});

	it("questions before a late player's arrival do not count for them", () => {
		const game = aReportGame({
			questions: 4,
			players: ["Ana", { nickname: "Caio", firstQuestionIndex: 2 }],
			answers: {
				Ana: ["right", "right", "right", "right"],
				Caio: [null, null, "right", "right"],
			},
		});

		const caio = byNickname(game).get("Caio");

		expect(questionsOf({ firstQuestionIndex: 2 }, 4)).toBe(2);
		expect(caio).toMatchObject({
			accuracy: { correct: 2, total: 2 },
			unanswered: 0,
		});
		// Nobody is charged for questions that were not played.
		expect(questionsOf({ firstQuestionIndex: 3 }, 2)).toBe(0);
		expect(overallAccuracy(game.participants, 4, 6)).toEqual({
			correct: 6,
			total: 6,
		});
	});

	it("a partially correct answer is not a right one", () => {
		const game = aReportGame({
			questions: 2,
			players: ["Ana"],
			answers: { Ana: ["partial", "right"] },
		});

		const [ana] = participantStats(game);

		expect(ana?.accuracy).toEqual({ correct: 1, total: 2 });
		expect(ana?.unanswered).toBe(0);
		// The points it earned still count.
		expect(ana?.total).toBe(1500);
	});

	it("ranks by total, ties by arrival", () => {
		const game = aReportGame({
			questions: 2,
			players: ["Ana", "Bia", "Caio"],
			answers: {
				Ana: ["wrong", "right"],
				Bia: ["right", "right"],
				Caio: ["right", "wrong"],
			},
		});

		expect(
			participantStats(game).map(({ nickname, rank, total }) => ({
				nickname,
				rank,
				total,
			})),
		).toEqual([
			{ nickname: "Bia", rank: 1, total: 2000 },
			{ nickname: "Ana", rank: 2, total: 1000 },
			{ nickname: "Caio", rank: 3, total: 1000 },
		]);
	});

	it("a participant needs help below 35%, not at 35%", () => {
		const right = (count: number) =>
			Array.from({ length: 20 }, (_, index) =>
				index < count ? "right" : "wrong",
			) as ("right" | "wrong")[];
		const game = aReportGame({
			questions: 20,
			players: ["Ana", "Bia", "Caio", "Dani"],
			answers: {
				Ana: right(6),
				Bia: right(7),
				Caio: right(14),
				Dani: right(2),
			},
		});

		// Lowest first.
		expect(
			needsHelp(participantStats(game)).map(({ nickname }) => nickname),
		).toEqual(["Dani", "Ana"]);
	});

	it("who had no question does not need help", () => {
		const game = aReportGame({
			questions: 2,
			players: ["Ana", { nickname: "Caio", firstQuestionIndex: 2 }],
			answers: { Ana: ["right", "right"] },
		});

		const stats = participantStats(game);

		expect(needsHelp(stats)).toEqual([]);
		expect(didNotFinish(stats)).toEqual([]);
		expect(stats.find(({ nickname }) => nickname === "Caio")?.accuracy).toEqual(
			{ correct: 0, total: 0 },
		);
	});

	it("did not finish lists who left questions unanswered, most first", () => {
		const game = aReportGame({
			questions: 3,
			players: ["Ana", "Bia", "Caio"],
			answers: {
				Ana: ["right", null, "right"],
				Bia: ["right", "right", "right"],
				Caio: [null, null, "right"],
			},
		});

		expect(
			didNotFinish(participantStats(game)).map(({ nickname, unanswered }) => ({
				nickname,
				unanswered,
			})),
		).toEqual([
			{ nickname: "Caio", unanswered: 2 },
			{ nickname: "Ana", unanswered: 1 },
		]);
	});

	it("an ended game counts only the played questions", () => {
		const game = aReportGame({
			header: {
				questionCount: 5,
				outcome: "ended",
				stoppedAt: { questionIndex: 2, phase: "answering" },
			},
			questions: 2,
			players: ["Ana"],
			answers: { Ana: ["right", "wrong"] },
		});

		const [ana] = participantStats(game);

		expect(ana?.accuracy).toEqual({ correct: 1, total: 2 });
		expect(ana?.unanswered).toBe(0);
	});

	it("duration goes from the start to the end", () => {
		const header = aReportHeader({
			startedAt: new Date("2026-06-13T17:45:10.000Z"),
			endedAt: new Date("2026-06-13T17:56:40.000Z"),
		});

		expect(durationMs(header)).toBe(11 * 60_000 + 30_000);
	});
});

describe("report stats: questions (spec 015)", () => {
	it("a question's accuracy counts who could answer it", () => {
		const game = aReportGame({
			questions: 3,
			players: ["Ana", { nickname: "Caio", firstQuestionIndex: 2 }],
			answers: {
				Ana: ["right", "wrong", "right"],
				Caio: [null, null, "wrong"],
			},
		});

		expect(questionStats(game).map(({ accuracy }) => accuracy)).toEqual([
			{ correct: 1, total: 1 },
			{ correct: 0, total: 1 },
			{ correct: 1, total: 2 },
		]);
	});

	it("a question is difficult below 35%, not at 35%", () => {
		const players = Array.from({ length: 20 }, (_, index) => `P${index}`);
		const column = (right: number) => (player: number) =>
			player < right ? ("right" as const) : ("wrong" as const);
		const columns = [column(6), column(7), column(8)];
		const game = aReportGame({
			questions: 3,
			players,
			answers: Object.fromEntries(
				players.map((nickname, player) => [
					nickname,
					columns.map((answerOf) => answerOf(player)),
				]),
			),
		});

		expect(
			difficultQuestions(questionStats(game)).map(({ index }) => index),
		).toEqual([0]);
	});

	it("difficult questions come hardest first, ties by order played", () => {
		const game = aReportGame({
			questions: 4,
			players: ["Ana", "Bia", "Caio", "Dani"],
			answers: {
				Ana: ["right", "wrong", "wrong", "right"],
				Bia: ["wrong", "wrong", "wrong", "right"],
				Caio: ["wrong", "wrong", "wrong", "right"],
				Dani: ["wrong", "wrong", "wrong", "wrong"],
			},
		});

		expect(
			difficultQuestions(questionStats(game)).map(({ index }) => index),
		).toEqual([1, 2, 0]);
	});

	it("counts who chose each answer and who did not answer", () => {
		const game = aReportGame({
			questions: 1,
			players: ["Ana", "Bia", "Caio", "Dani", "Edu"],
			answers: {
				Ana: ["right"],
				Bia: ["wrong"],
				Caio: ["wrong"],
				Dani: [{ choiceIds: ["q0-c"], correctness: "wrong" }],
				Edu: [null],
			},
		});

		const [question] = questionStats(game);

		expect(question?.choiceCounts).toEqual([
			{ choiceId: "q0-a", count: 1 },
			{ choiceId: "q0-b", count: 2 },
			{ choiceId: "q0-c", count: 1 },
			{ choiceId: "q0-d", count: 0 },
		]);
		expect(question?.unanswered).toBe(1);
	});

	it("the average time is of who answered", () => {
		const game = aReportGame({
			questions: 1,
			players: ["Ana", "Bia", "Caio"],
			answers: {
				Ana: [
					{ choiceIds: ["q0-a"], correctness: "correct", responseTimeMs: 3000 },
				],
				Bia: [
					{ choiceIds: ["q0-b"], correctness: "wrong", responseTimeMs: 6000 },
				],
				Caio: [null],
			},
		});

		expect(questionStats(game)[0]?.averageResponseTimeMs).toBe(4500);
	});

	it("no average when nobody answered", () => {
		const game = aReportGame({
			questions: 1,
			players: ["Ana"],
			answers: { Ana: [null] },
		});

		expect(questionStats(game)[0]).toMatchObject({
			averageResponseTimeMs: null,
			accuracy: { correct: 0, total: 1 },
			unanswered: 1,
		});
	});
});
