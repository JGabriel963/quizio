import { HOST_AWAY_AFTER_MS } from "@quizio/core/game/domain/host-presence";
import { describe, expect, it } from "vitest";

import type { HostGameData } from "./api-types";
import {
	answerShapeName,
	applyAnswerCount,
	finalMessage,
	nextSessionCheckInMs,
	positionMessage,
	showsStage,
	stageOrder,
	waitingPhrase,
} from "./game-stage";

const answering: HostGameData = {
	gameId: "game-1",
	quizId: "quiz-1",
	title: "Capitais",
	pin: "265914",
	status: "playing",
	endReason: null,
	locked: false,
	options: {
		showQuestionsOnDevices: false,
		randomizeQuestions: false,
		randomizeAnswers: false,
	},
	players: [{ id: "p1", nickname: "Ana" }],
	questionCount: 3,
	stage: {
		questionIndex: 1,
		phase: "answering",
		remainingMs: 12_000,
		durationMs: 20_000,
		question: null,
		answerCount: 2,
		distribution: null,
		scoreboard: null,
		scoreboardLeavers: null,
	},
	final: null,
};

const publicStage = (
	questionIndex: number,
	phase: "questionIntro" | "answering" | "results",
) => ({
	questionIndex,
	questionCount: 3,
	phase,
	durationMs: null,
	question: null,
});

describe("stage events on the host's view (spec 009)", () => {
	it("orders stages by question, then by phase", () => {
		const order = [
			{ questionIndex: 0, phase: "gameIntro" },
			{ questionIndex: 0, phase: "questionIntro" },
			{ questionIndex: 0, phase: "answering" },
			{ questionIndex: 0, phase: "results" },
			{ questionIndex: 1, phase: "questionIntro" },
		] as const;

		const values = order.map(stageOrder);

		expect(values).toEqual([...values].sort((a, b) => a - b));
		expect(new Set(values).size).toBe(order.length);
	});

	it("knows when the view already shows the stage of an event", () => {
		expect(
			showsStage(answering, {
				status: "playing",
				stage: publicStage(1, "answering"),
			}),
		).toBe(true);
		// An event that arrives late, after the view moved on.
		expect(
			showsStage(answering, {
				status: "playing",
				stage: publicStage(1, "questionIntro"),
			}),
		).toBe(true);
	});

	it("knows when the view is behind", () => {
		expect(
			showsStage(answering, {
				status: "playing",
				stage: publicStage(1, "results"),
			}),
		).toBe(false);
		expect(showsStage(answering, { status: "finished", stage: null })).toBe(
			false,
		);
		expect(
			showsStage(
				{ ...answering, status: "lobby", stage: null },
				{ status: "playing", stage: publicStage(0, "questionIntro") },
			),
		).toBe(false);
	});

	it("raises the total of answers of the question on screen", () => {
		expect(
			applyAnswerCount(answering, { questionIndex: 1, count: 3 }).stage
				?.answerCount,
		).toBe(3);
	});

	it("ignores a total that is older, or of another question", () => {
		expect(applyAnswerCount(answering, { questionIndex: 1, count: 1 })).toBe(
			answering,
		);
		expect(applyAnswerCount(answering, { questionIndex: 0, count: 9 })).toBe(
			answering,
		);
	});
});

describe("player texts (spec 009)", () => {
	it("keeps one waiting phrase per question", () => {
		expect(waitingPhrase(0)).toBe("Resposta recebida!");
		expect(waitingPhrase(1)).toBe("Será que acertou?");
		expect(waitingPhrase(3)).toBe("Mamão com açúcar!");
		// They come around again after the last one.
		expect(waitingPhrase(5)).toBe(waitingPhrase(0));
	});

	it("names each button by shape and color", () => {
		expect([0, 1, 2, 3].map(answerShapeName)).toEqual([
			"Triângulo vermelho",
			"Losango azul",
			"Círculo amarelo",
			"Quadrado verde",
		]);
	});
});

describe("positionMessage (spec 010)", () => {
	it("is on the podium up to third place", () => {
		for (const rank of [1, 2, 3]) {
			expect(
				positionMessage({ rank, behind: { nickname: "Bia", points: 10 } }),
			).toEqual({ title: "Você está no pódio!", detail: null });
		}
	});

	it("tells the place and who is ahead, from fourth on", () => {
		expect(
			positionMessage({ rank: 5, behind: { nickname: "Bia", points: 120 } }),
		).toEqual({
			title: "Você está em 5º lugar",
			detail: "120 pontos atrás de Bia",
		});
		expect(
			positionMessage({ rank: 4, behind: { nickname: "Ana", points: 1 } }),
		).toEqual({
			title: "Você está em 4º lugar",
			detail: "1 ponto atrás de Ana",
		});
	});

	it("orders the scoreboard after the results", () => {
		expect(
			stageOrder({ questionIndex: 0, phase: "scoreboard" }),
		).toBeGreaterThan(stageOrder({ questionIndex: 0, phase: "results" }));
		expect(stageOrder({ questionIndex: 0, phase: "scoreboard" })).toBeLessThan(
			stageOrder({ questionIndex: 1, phase: "questionIntro" }),
		);
	});
});

describe("finalMessage (spec 011)", () => {
	it("gives the medal and a phrase up to third place", () => {
		expect(finalMessage(1)).toEqual({
			medal: 1,
			title: "Imbatível!",
			detail: null,
		});
		expect(finalMessage(2)).toMatchObject({ medal: 2, title: "Por pouco!" });
		expect(finalMessage(3)).toMatchObject({ medal: 3, title: "No pódio!" });
	});

	it("tells the place from fourth on, without a medal", () => {
		expect(finalMessage(5)).toEqual({
			medal: null,
			title: "Você ficou em 5º lugar",
			detail: "Obrigado por jogar!",
		});
	});
});

describe("nextSessionCheckInMs (spec 013, RN-14)", () => {
	it("asks at the usual interval while the host is signalling", () => {
		// The host gave a sign 2 s ago: 10 s of silence are further than the
		// usual check of a game in progress.
		expect(nextSessionCheckInMs(2_000, 5_000)).toBe(5_000);
	});

	it("asks again when the silence would reach 10 s", () => {
		// In the lobby the device asks every 15 s: too late to tell at 10 s.
		const wait = nextSessionCheckInMs(2_000, 15_000);
		expect(wait).toBeGreaterThanOrEqual(HOST_AWAY_AFTER_MS - 2_000);
		expect(wait).toBeLessThan(HOST_AWAY_AFTER_MS - 2_000 + 500);

		// One signal missed already: the next reading settles it.
		const soon = nextSessionCheckInMs(9_600, 5_000);
		expect(soon).toBeGreaterThanOrEqual(400);
		expect(soon).toBeLessThan(900);
	});

	it("keeps the usual interval once the host is away", () => {
		expect(nextSessionCheckInMs(HOST_AWAY_AFTER_MS, 5_000)).toBe(5_000);
		expect(nextSessionCheckInMs(60_000, 15_000)).toBe(15_000);
	});

	it("keeps the usual interval without an idle time", () => {
		expect(nextSessionCheckInMs(null, 15_000)).toBe(15_000);
	});
});
