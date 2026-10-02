import { describe, expect, it } from "vitest";

import { aQuestion } from "../../quiz/testing/a-question";
import { createStartedGame } from "../testing/started-game";
import { createEndGame } from "./end-game";
import { createGetHostGame } from "./get-host-game";
import { createGetPlayerSession } from "./get-player-session";
import { createRemovePlayer } from "./remove-player";

const player = (number: number) => ({
	gameId: "game-1",
	playerId: `p${number}`,
	secret: `s${number}`,
});

/** A quiz question of 20 s whose first answers are right. */
const quiz = (overrides: Parameters<typeof aQuestion>[0] = {}, correct = 1) =>
	aQuestion({
		choices: ["a", "b", "c", "d"].map((text, index) => ({
			id: `choice-${index + 1}`,
			text,
			correct: index < correct,
		})),
		...overrides,
	});

/** Answers 1 and 2 are right. */
const multipleChoice = quiz({ selection: "multiple" }, 2);

describe("getPlayerSession during a game (spec 009)", () => {
	it("is getting ready during the game intro", async () => {
		const { deps } = await createStartedGame();

		expect(await createGetPlayerSession(deps)(player(1))).toEqual({
			gameId: "game-1",
			nickname: "Ana",
			status: "playing",
			stage: {
				questionIndex: 0,
				questionCount: 2,
				phase: "gameIntro",
				durationMs: 3_000,
				remainingMs: 3_000,
				question: null,
				sittingOut: false,
				answered: false,
				total: 0,
				outcome: null,
			},
			final: null,
		});
	});

	it("counts down the question intro, without answer buttons to tap yet", async () => {
		const { deps, reach } = await createStartedGame();
		await reach("questionIntro", 1);
		deps.clock.advanceBy(2_000);

		const { stage } = await createGetPlayerSession(deps)(player(1));

		expect(stage).toMatchObject({
			questionIndex: 1,
			phase: "questionIntro",
			remainingMs: 3_000,
			question: { type: "trueFalse" },
		});
	});

	it("shows shapes without texts while answering", async () => {
		const { deps, reach } = await createStartedGame();
		await reach("answering");
		deps.clock.advanceBy(8_000);

		const view = await createGetPlayerSession(deps)(player(1));

		expect(view.stage).toEqual({
			questionIndex: 0,
			questionCount: 2,
			phase: "answering",
			durationMs: 20_000,
			remainingMs: 12_000,
			question: {
				type: "quiz",
				selection: "single",
				text: null,
				image: null,
				choices: [
					{ id: "choice-1", shapeIndex: 0, label: null, text: null },
					{ id: "choice-2", shapeIndex: 1, label: null, text: null },
					{ id: "choice-3", shapeIndex: 2, label: null, text: null },
					{ id: "choice-4", shapeIndex: 3, label: null, text: null },
				],
			},
			sittingOut: false,
			answered: false,
			total: 0,
			outcome: null,
		});
		expect(JSON.stringify(view)).not.toMatch(/Brasília|capital|correct/i);
	});

	it("knows the player has answered, and says nothing about the result", async () => {
		const { deps, reach, answer } = await createStartedGame();
		await reach("answering");
		await answer(1, "choice-1");
		const getPlayerSession = createGetPlayerSession(deps);

		expect((await getPlayerSession(player(1))).stage).toMatchObject({
			answered: true,
			total: 0,
			outcome: null,
		});
		expect((await getPlayerSession(player(2))).stage).toMatchObject({
			answered: false,
			outcome: null,
		});
	});

	it("tells each player the result, and not which answer was right", async () => {
		const { deps, reach, answer } = await createStartedGame({
			players: ["Ana", "Bia", "Caio"],
		});
		await reach("answering");
		await answer(1, "choice-1");
		await answer(2, "choice-3");
		await reach("results");
		const getPlayerSession = createGetPlayerSession(deps);

		const views = await Promise.all(
			[1, 2, 3].map((n) => getPlayerSession(player(n))),
		);

		expect(views.map((view) => view.stage?.outcome?.result)).toEqual([
			"correct",
			"wrong",
			"timeout",
		]);
		expect(views.map((view) => view.stage?.answered)).toEqual([
			true,
			true,
			false,
		]);
		expect(JSON.stringify(views)).not.toMatch(/Brasília|"correct":/);
	});

	it("grades multiple selection", async () => {
		const { deps, reach, answer } = await createStartedGame({
			players: ["Ana", "Bia", "Caio"],
			questions: [multipleChoice],
		});
		await reach("answering");
		await answer(1, "choice-1", "choice-2");
		await answer(2, "choice-1");
		await answer(3, "choice-1", "choice-3");
		const getPlayerSession = createGetPlayerSession(deps);

		const outcomes = await Promise.all(
			[1, 2, 3].map(
				async (n) => (await getPlayerSession(player(n))).stage?.outcome,
			),
		);

		expect(outcomes.map((outcome) => outcome?.result)).toEqual([
			"correct",
			"partiallyCorrect",
			"wrong",
		]);
		// Each right answer marked is worth the question's points.
		expect(outcomes.map((outcome) => outcome?.points)).toEqual([2000, 1000, 0]);
	});

	it("is finished after the last question, and ended when the host closes it", async () => {
		const finished = await createStartedGame();
		await finished.finish();
		expect(
			await createGetPlayerSession(finished.deps)(player(1)),
		).toMatchObject({ status: "finished", stage: null });

		const ended = await createStartedGame();
		await ended.reach("answering");
		await createEndGame(ended.deps)(ended.host);
		expect(await createGetPlayerSession(ended.deps)(player(1))).toMatchObject({
			status: "ended",
			stage: null,
			final: null,
		});
	});
});

describe("getPlayerSession: points, streak and place (spec 010)", () => {
	it("tells the points, the streak and the place at the results", async () => {
		const { deps, reach, answer } = await createStartedGame();
		await reach("answering");
		deps.clock.advanceBy(5_000);
		await answer(1, "choice-1");
		await reach("results");

		const { stage } = await createGetPlayerSession(deps)(player(1));

		expect(stage).toMatchObject({
			phase: "results",
			total: 875,
			outcome: {
				result: "correct",
				points: 875,
				streak: 1,
				rank: 1,
				behind: null,
			},
		});
	});

	it("keeps the total as it was until the results", async () => {
		const { deps, reach, answer } = await createStartedGame();
		await reach("answering");
		deps.clock.advanceBy(5_000);
		await answer(1, "choice-1");
		await reach("answering", 1);
		const getPlayerSession = createGetPlayerSession(deps);
		expect((await getPlayerSession(player(1))).stage?.total).toBe(875);

		await answer(1, "true");

		// Answered, and still the total of before: nothing tells how it went.
		const waiting = (await getPlayerSession(player(1))).stage;
		expect(waiting).toMatchObject({
			answered: true,
			total: 875,
			outcome: null,
		});
		expect(JSON.stringify(waiting)).not.toMatch(/points|streak|rank/);

		await reach("results", 1);
		expect((await getPlayerSession(player(1))).stage).toMatchObject({
			total: 1875,
			outcome: { points: 1000, streak: 2 },
		});
	});

	it("keeps telling the outcome during the scoreboard", async () => {
		const { deps, reach, answer } = await createStartedGame();
		await reach("answering");
		await answer(1, "choice-1");
		await reach("scoreboard");

		const { stage } = await createGetPlayerSession(deps)(player(1));

		expect(stage).toMatchObject({
			phase: "scoreboard",
			question: { type: "quiz" },
			total: 1000,
			outcome: { result: "correct", points: 1000, streak: 1, rank: 1 },
		});
	});

	it("gives no points and no streak to a wrong answer or no answer", async () => {
		const { deps, reach, answer } = await createStartedGame({
			players: ["Ana", "Bia", "Caio"],
		});
		await reach("answering");
		await answer(1, "choice-1");
		await reach("answering", 1);
		await answer(1, "false");
		await answer(2, "true");
		await reach("results", 1);
		const getPlayerSession = createGetPlayerSession(deps);

		// Ana had a streak of 1 and missed; Caio never answered.
		expect((await getPlayerSession(player(1))).stage).toMatchObject({
			total: 1000,
			outcome: { result: "wrong", points: 0, streak: 0 },
		});
		expect((await getPlayerSession(player(3))).stage).toMatchObject({
			total: 0,
			outcome: { result: "timeout", points: 0, streak: 0, rank: 3 },
		});
	});

	it("hides the points of a no-points question, and still counts the streak", async () => {
		const { deps, reach, answer } = await createStartedGame({
			questions: [quiz(), quiz({ id: "question-2", points: "noPoints" })],
		});
		await reach("answering");
		await answer(1, "choice-1");
		await reach("answering", 1);
		await answer(1, "choice-1");
		await reach("results", 1);

		const { stage } = await createGetPlayerSession(deps)(player(1));

		expect(stage).toMatchObject({
			total: 1000,
			outcome: { result: "correct", points: null, streak: 2 },
		});
	});

	it("tells who is right ahead, and by how much", async () => {
		const { deps, reach, answer } = await createStartedGame({
			players: ["Ana", "Bia", "Caio", "Duda", "Eva"],
		});
		await reach("answering");
		// One second apart: 975, 950, 925, 900 and 875 points.
		for (const number of [1, 2, 3, 4, 5]) {
			deps.clock.advanceBy(1_000);
			await answer(number, "choice-1");
		}
		const getPlayerSession = createGetPlayerSession(deps);

		expect((await getPlayerSession(player(5))).stage?.outcome).toMatchObject({
			rank: 5,
			behind: { nickname: "Duda", points: 25 },
		});
		expect((await getPlayerSession(player(2))).stage?.outcome).toMatchObject({
			rank: 2,
			behind: { nickname: "Ana", points: 25 },
		});
		expect(
			(await getPlayerSession(player(1))).stage?.outcome?.behind,
		).toBeNull();
	});

	it("does not send anybody else's total", async () => {
		const { deps, reach, answer } = await createStartedGame();
		await reach("answering");
		deps.clock.advanceBy(3_000);
		await answer(1, "choice-1");
		await answer(2, "choice-2");

		const view = await createGetPlayerSession(deps)(player(2));

		// Bia is behind Ana by Ana's 925 points; Ana's total itself is not there.
		expect(view.stage?.outcome).toEqual({
			result: "wrong",
			points: 0,
			streak: 0,
			rank: 2,
			behind: { nickname: "Ana", points: 925 },
		});
		expect(view.stage?.total).toBe(0);
	});
});

describe("getPlayerSession: the final screen (spec 011)", () => {
	it("a finished game tells the place, the total and the title", async () => {
		const { deps, reach, answer, finish } = await createStartedGame({
			players: ["Ana", "Bia", "Caio", "Duda"],
		});
		const getPlayerSession = createGetPlayerSession(deps);
		await reach("answering");
		await answer(2, "choice-1");
		deps.clock.advanceBy(5_000);
		await answer(3, "choice-1");
		await reach("answering", 1);
		await answer(3, "true");
		await finish();

		expect(await getPlayerSession(player(3))).toEqual({
			gameId: "game-1",
			nickname: "Caio",
			status: "finished",
			stage: null,
			final: {
				title: "Bom de Bíblia (Junho)",
				rank: 1,
				total: 1875,
				revealRemainingMs: 7_000,
			},
		});
		expect((await getPlayerSession(player(2))).final).toMatchObject({
			rank: 2,
			total: 1000,
		});
		// Nobody shares a place: ties go by arrival (RN-05).
		expect((await getPlayerSession(player(1))).final).toMatchObject({
			rank: 3,
			total: 0,
		});
		expect((await getPlayerSession(player(4))).final).toMatchObject({
			rank: 4,
			total: 0,
		});
	});

	it("the final stays the same when asked again, with the reveal over", async () => {
		const { deps, finish } = await createStartedGame();
		const getPlayerSession = createGetPlayerSession(deps);
		await finish();
		const first = await getPlayerSession(player(1));
		deps.clock.advanceBy(60_000);

		const again = await getPlayerSession(player(1));

		expect(again.final).toEqual({ ...first.final, revealRemainingMs: 0 });
	});

	it("a removed player has no final", async () => {
		const { deps, host, reach, finish } = await createStartedGame();
		await reach("answering");
		await createRemovePlayer(deps)({ ...host, playerId: "p2" });
		await finish();

		expect(await createGetPlayerSession(deps)(player(2))).toMatchObject({
			status: "removed",
			stage: null,
			final: null,
		});
	});

	it("has no final while the game is being played", async () => {
		const { deps, reach } = await createStartedGame();
		await reach("results", 1);

		expect((await createGetPlayerSession(deps)(player(1))).final).toBeNull();
	});
});

describe("getPlayerSession: who joined in the middle (spec 012)", () => {
	it("who joined late sits out the question in course", async () => {
		const { deps, reach, join } = await createStartedGame();
		await reach("answering");
		deps.clock.advanceBy(4_000);

		const caio = await join("Caio");

		expect(await createGetPlayerSession(deps)(caio)).toEqual({
			gameId: "game-1",
			nickname: "Caio",
			status: "playing",
			stage: {
				questionIndex: 0,
				questionCount: 2,
				phase: "answering",
				durationMs: 20_000,
				remainingMs: 16_000,
				question: null,
				sittingOut: true,
				answered: false,
				total: 0,
				outcome: null,
			},
			final: null,
		});
	});

	it("sits out without a result and without time over", async () => {
		const { deps, reach, join, answer } = await createStartedGame();
		await reach("answering");
		const caio = await join("Caio");
		await answer(1, "choice-1");
		const getPlayerSession = createGetPlayerSession(deps);

		for (const phase of ["results", "scoreboard"] as const) {
			await reach(phase);

			expect((await getPlayerSession(caio)).stage).toMatchObject({
				phase,
				sittingOut: true,
				question: null,
				total: 0,
				outcome: null,
			});
		}
		// Who was there is told as before.
		expect((await getPlayerSession(player(2))).stage?.outcome?.result).toBe(
			"timeout",
		);
	});

	it("who joined before the answers opened plays that question", async () => {
		const { deps, reach, join } = await createStartedGame();
		await reach("questionIntro");
		const caio = await join("Caio");
		await reach("answering");

		expect((await createGetPlayerSession(deps)(caio)).stage).toMatchObject({
			sittingOut: false,
			question: { type: "quiz" },
		});
	});

	it("plays the next question normally", async () => {
		const { deps, reach, join, submitAnswer } = await createStartedGame();
		await reach("answering");
		const caio = await join("Caio");
		const getPlayerSession = createGetPlayerSession(deps);

		await reach("questionIntro", 1);
		expect((await getPlayerSession(caio)).stage).toMatchObject({
			sittingOut: false,
			question: { type: "trueFalse" },
		});

		await reach("answering", 1);
		await submitAnswer({ ...caio, questionIndex: 1, choiceIds: ["true"] });
		await reach("results", 1);

		expect((await getPlayerSession(caio)).stage).toMatchObject({
			sittingOut: false,
			answered: true,
			total: 1000,
			outcome: { result: "correct", points: 1000, streak: 1 },
		});
	});

	it("is in the standings with zero, after who was there", async () => {
		const { deps, host, reach, join, answer } = await createStartedGame();
		await reach("answering");
		await answer(1, "choice-1");
		const caio = await join("Caio");
		await reach("scoreboard");

		const view = await createGetHostGame(deps)(host);

		expect(
			view.stage?.scoreboard?.map((entry) => [entry.nickname, entry.total]),
		).toEqual([
			["Ana", 1000],
			["Bia", 0],
			["Caio", 0],
		]);
		expect(view.players.map((entry) => entry.nickname)).toEqual([
			"Ana",
			"Bia",
			"Caio",
		]);
		expect((await createGetPlayerSession(deps)(caio)).stage).toMatchObject({
			total: 0,
			outcome: null,
		});
	});

	it("goes to the end with zero and the last place", async () => {
		const { deps, reach, join, finish } = await createStartedGame();
		await reach("answering", 1);
		const caio = await join("Caio");

		expect((await createGetPlayerSession(deps)(caio)).stage).toMatchObject({
			sittingOut: true,
		});
		await finish();

		expect(await createGetPlayerSession(deps)(caio)).toMatchObject({
			status: "finished",
			stage: null,
			final: { rank: 3, total: 0 },
		});
	});
});

describe("getPlayerSession: the questions on the devices (spec 012)", () => {
	const image = {
		key: "quizzes/quiz-1/questions/mapa.png",
		placement: "background" as const,
		crop: { shape: "square" as const, zoom: 1.5, x: 0.5, y: 0.5 },
		altText: "Mapa do Brasil",
	};
	const onDevices = { showQuestionsOnDevices: true };

	it("gets the statement, the texts and the image with the option on", async () => {
		const { deps, reach } = await createStartedGame({
			questions: [quiz({ image }), quiz()],
			options: onDevices,
		});
		await reach("answering");

		const view = await createGetPlayerSession(deps)(player(1));

		expect(view.stage?.question).toEqual({
			type: "quiz",
			selection: "single",
			text: "Qual é a capital do Brasil?",
			image: {
				url: "https://media.test/quizzes/quiz-1/questions/mapa.png",
				crop: image.crop,
				altText: "Mapa do Brasil",
			},
			choices: [
				{ id: "choice-1", shapeIndex: 0, label: null, text: "a" },
				{ id: "choice-2", shapeIndex: 1, label: null, text: "b" },
				{ id: "choice-3", shapeIndex: 2, label: null, text: "c" },
				{ id: "choice-4", shapeIndex: 3, label: null, text: "d" },
			],
		});
		// Never which one is right (RN-20).
		expect(JSON.stringify(view)).not.toMatch(/"correct":/);
	});

	it("gets the statement alone in the question's intro", async () => {
		const { deps, reach } = await createStartedGame({
			questions: [quiz({ image }), quiz()],
			options: onDevices,
		});
		await reach("questionIntro");

		const { stage } = await createGetPlayerSession(deps)(player(1));

		expect(stage?.question).toMatchObject({
			text: "Qual é a capital do Brasil?",
			image: null,
		});
		expect(
			stage?.question?.choices.every((choice) => choice.text === null),
		).toBe(true);
	});

	it("true or false gets its two texts", async () => {
		const { deps, reach } = await createStartedGame({ options: onDevices });
		await reach("answering", 1);

		const { stage } = await createGetPlayerSession(deps)(player(1));

		expect(stage?.question?.choices.map((choice) => choice.text)).toEqual([
			"Verdadeiro",
			"Falso",
		]);
	});

	it("the drawn positions are the same for every player and for the host", async () => {
		const { deps, host, reach } = await createStartedGame({
			options: { ...onDevices, randomizeAnswers: true },
		});
		await reach("answering");
		const getPlayerSession = createGetPlayerSession(deps);

		const onHost = (await createGetHostGame(deps)(host)).stage?.question
			?.choices;
		const first = (await getPlayerSession(player(1))).stage?.question?.choices;
		const second = (await getPlayerSession(player(2))).stage?.question?.choices;

		const places = (choices: typeof first) =>
			choices?.map((choice) => [choice.shapeIndex, choice.text]);
		expect(places(first)).toEqual([
			[0, "Recife"],
			[1, "Salvador"],
			[2, "Rio de Janeiro"],
			[3, "Brasília"],
		]);
		expect(places(second)).toEqual(places(first));
		expect(onHost?.map((choice) => [choice.shapeIndex, choice.text])).toEqual(
			places(first),
		);
	});

	it("the right answer follows its answer to the drawn shape", async () => {
		const { deps, host, reach, answer } = await createStartedGame({
			options: { randomizeAnswers: true },
		});
		await reach("answering");

		// "Brasília" went to the last shape; its id is still the right one.
		await answer(1, "choice-1");
		await answer(2, "choice-4");

		const getPlayerSession = createGetPlayerSession(deps);
		expect((await getPlayerSession(player(1))).stage?.outcome?.result).toBe(
			"correct",
		);
		expect((await getPlayerSession(player(2))).stage?.outcome?.result).toBe(
			"wrong",
		);
		const revealed = (await createGetHostGame(deps)(host)).stage?.question
			?.choices;
		expect(revealed?.find((choice) => choice.correct)).toMatchObject({
			shapeIndex: 3,
			text: "Brasília",
		});
	});
});
