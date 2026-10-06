import { describe, expect, it } from "vitest";

import { FixedClock } from "../../shared/testing/fixed-clock";
import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { ReportInTrashError, ReportNotFoundError } from "../domain/report";
import { aReportGame, aReportQuestion } from "../testing/a-report-game";
import { InMemoryReportStore } from "../testing/in-memory-report-store";
import { createGetReportParticipant } from "./get-report-participant";
import { createGetReportQuestion } from "./get-report-question";

function setup(game: ReturnType<typeof aReportGame>) {
	const storage = new InMemoryObjectStorage();
	const deps = {
		reportGames: new InMemoryReportStore([game]),
		storage,
		clock: new FixedClock("2026-06-20T12:00:00.000Z"),
	};
	const getParticipant = createGetReportParticipant(deps);
	const getQuestion = createGetReportQuestion(deps);
	return {
		storage,
		participant: (nickname: string, ownerId = "user-1") =>
			getParticipant({
				ownerId,
				gameId: "game-1",
				playerId: `player-${nickname}`,
			}),
		question: (questionIndex: number, ownerId = "user-1") =>
			getQuestion({ ownerId, gameId: "game-1", questionIndex }),
	};
}

const threeQuestions = () =>
	aReportGame({
		questions: [
			aReportQuestion(0, { text: "Capital do Brasil?" }),
			aReportQuestion(1, { text: "Capital da França?" }),
			aReportQuestion(2, { text: "Capital do Japão?" }),
		],
		players: ["Ana", "Bia"],
		answers: {
			Ana: [
				{
					choiceIds: ["q0-a"],
					correctness: "correct",
					points: 893,
					responseTimeMs: 3200,
				},
				"wrong",
				null,
			],
			Bia: ["right", "right", "right"],
		},
	});

describe("getReportParticipant (spec 015)", () => {
	it("a participant's answers, question by question", async () => {
		const ana = await setup(threeQuestions()).participant("Ana");

		expect(ana).toMatchObject({
			playerId: "player-Ana",
			nickname: "Ana",
			rank: 2,
			total: 893,
			accuracyPercent: 33,
			unanswered: 1,
		});
		expect(ana.answers.slice(0, 2)).toEqual([
			{
				questionIndex: 0,
				text: "Capital do Brasil?",
				type: "quiz",
				result: "correct",
				choices: [{ shapeIndex: 0, text: "Resposta A", correct: true }],
				points: 893,
				responseTimeMs: 3200,
			},
			{
				questionIndex: 1,
				text: "Capital da França?",
				type: "quiz",
				result: "wrong",
				choices: [{ shapeIndex: 1, text: "Resposta B", correct: false }],
				points: 0,
				responseTimeMs: 2000,
			},
		]);
	});

	it("a question without an answer comes as unanswered", async () => {
		const ana = await setup(threeQuestions()).participant("Ana");

		expect(ana.answers[2]).toEqual({
			questionIndex: 2,
			text: "Capital do Japão?",
			type: "quiz",
			result: "unanswered",
			choices: [],
			points: 0,
			responseTimeMs: null,
		});
	});

	it("a partially correct answer keeps its points", async () => {
		const { participant } = setup(
			aReportGame({
				questions: 1,
				players: ["Ana"],
				answers: { Ana: ["partial"] },
			}),
		);

		const ana = await participant("Ana");

		expect(ana.accuracyPercent).toBe(0);
		expect(ana.answers[0]).toMatchObject({
			result: "partiallyCorrect",
			points: 500,
		});
	});

	it("a late player has only their questions", async () => {
		const { participant } = setup(
			aReportGame({
				questions: 4,
				players: ["Ana", { nickname: "Caio", firstQuestionIndex: 2 }],
				answers: {
					Ana: ["right", "right", "right", "right"],
					Caio: [null, null, "right", "right"],
				},
			}),
		);

		const caio = await participant("Caio");

		expect(caio.answers.map(({ questionIndex }) => questionIndex)).toEqual([
			2, 3,
		]);
		expect(caio).toMatchObject({ accuracyPercent: 100, unanswered: 0 });
	});

	it("an unknown participant is not found", async () => {
		const { participant } = setup(threeQuestions());

		await expect(participant("Zeca")).rejects.toBeInstanceOf(
			ReportNotFoundError,
		);
		await expect(participant("Ana", "user-2")).rejects.toBeInstanceOf(
			ReportNotFoundError,
		);
	});
});

describe("getReportQuestion (spec 015)", () => {
	const fourChoices = () =>
		aReportGame({
			questions: [
				aReportQuestion(0, {
					text: "Quem escreveu o Salmo 90?",
					imageKey: "questions/salmo.png",
				}),
			],
			players: ["Ana", "Bia", "Caio", "Dani"],
			answers: {
				Ana: [
					{ choiceIds: ["q0-a"], correctness: "correct", responseTimeMs: 4000 },
				],
				Bia: [
					{ choiceIds: ["q0-b"], correctness: "wrong", responseTimeMs: 6000 },
				],
				Caio: [
					{ choiceIds: ["q0-b"], correctness: "wrong", responseTimeMs: 5000 },
				],
				Dani: [null],
			},
		});

	it("a question's answers, counts and participants", async () => {
		const { question, storage } = setup(fourChoices());

		const detail = await question(0);

		expect(detail).toMatchObject({
			index: 0,
			text: "Quem escreveu o Salmo 90?",
			type: "quiz",
			imageUrl: storage.getPublicUrl("questions/salmo.png"),
			accuracyPercent: 25,
			difficult: true,
			unanswered: 1,
			averageResponseTimeMs: 5000,
		});
		expect(detail.choices).toEqual([
			{
				id: "q0-a",
				shapeIndex: 0,
				text: "Resposta A",
				correct: true,
				count: 1,
			},
			{
				id: "q0-b",
				shapeIndex: 1,
				text: "Resposta B",
				correct: false,
				count: 2,
			},
			{
				id: "q0-c",
				shapeIndex: 2,
				text: "Resposta C",
				correct: false,
				count: 0,
			},
			{
				id: "q0-d",
				shapeIndex: 3,
				text: "Resposta D",
				correct: false,
				count: 0,
			},
		]);
		// By the game's standings.
		expect(detail.participants).toEqual([
			{
				playerId: "player-Ana",
				nickname: "Ana",
				result: "correct",
				choices: [{ shapeIndex: 0, text: "Resposta A", correct: true }],
				points: 1000,
				responseTimeMs: 4000,
			},
			{
				playerId: "player-Bia",
				nickname: "Bia",
				result: "wrong",
				choices: [{ shapeIndex: 1, text: "Resposta B", correct: false }],
				points: 0,
				responseTimeMs: 6000,
			},
			{
				playerId: "player-Caio",
				nickname: "Caio",
				result: "wrong",
				choices: [{ shapeIndex: 1, text: "Resposta B", correct: false }],
				points: 0,
				responseTimeMs: 5000,
			},
			{
				playerId: "player-Dani",
				nickname: "Dani",
				result: "unanswered",
				choices: [],
				points: 0,
				responseTimeMs: null,
			},
		]);
	});

	it("leaves out who could not answer it", async () => {
		const { question } = setup(
			aReportGame({
				questions: 2,
				players: ["Ana", { nickname: "Caio", firstQuestionIndex: 1 }],
				answers: { Ana: ["right", "right"], Caio: [null, "wrong"] },
			}),
		);

		expect(
			(await question(0)).participants.map(({ nickname }) => nickname),
		).toEqual(["Ana"]);
		expect((await question(1)).participants).toHaveLength(2);
	});

	it("a question that was not played is not found", async () => {
		const { question } = setup(
			aReportGame({
				header: {
					questionCount: 3,
					outcome: "ended",
					stoppedAt: { questionIndex: 1, phase: "answering" },
				},
				questions: 3,
				players: ["Ana"],
				answers: { Ana: ["right", "right"] },
			}),
		);

		await expect(question(0)).resolves.toMatchObject({ index: 0 });
		await expect(question(1)).rejects.toBeInstanceOf(ReportNotFoundError);
		await expect(question(7)).rejects.toBeInstanceOf(ReportNotFoundError);
	});

	it("a trashed report shows no details", async () => {
		const { question, participant } = setup(
			aReportGame({
				header: { trashedAt: new Date("2026-06-15T10:00:00.000Z") },
				questions: 1,
				players: ["Ana"],
			}),
		);

		await expect(question(0)).rejects.toBeInstanceOf(ReportInTrashError);
		await expect(participant("Ana")).rejects.toBeInstanceOf(ReportInTrashError);
	});
});
