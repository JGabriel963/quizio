import { describe, expect, it } from "vitest";

import type { Question } from "../../quiz/domain/question";
import { aQuestion, aTrueFalseQuestion } from "../../quiz/testing/a-question";
import { somePlayableQuestions } from "../testing/game-deps";
import { createStartedGame } from "../testing/started-game";
import { createEndGame } from "./end-game";
import { createGetHostGame } from "./get-host-game";
import { createRemovePlayer } from "./remove-player";

const mine = { ownerId: "user-1", gameId: "game-1" };

const choice = (text: string | null, correct = false) => ({ text, correct });
const quizWith = (
	choices: { text: string | null; correct: boolean }[],
	overrides: Parameters<typeof aQuestion>[0] = {},
) =>
	aQuestion({
		choices: choices.map((entry, index) => ({
			id: `choice-${index + 1}`,
			...entry,
		})),
		...overrides,
	});

describe("getHostGame during a game (spec 009)", () => {
	it("shows the question of the intro and its position", async () => {
		const { deps, reach } = await createStartedGame();
		await reach("questionIntro", 1);

		const view = await createGetHostGame(deps)(mine);

		expect(view).toMatchObject({
			status: "playing",
			questionCount: 2,
			stage: {
				questionIndex: 1,
				phase: "questionIntro",
				remainingMs: 6_500,
				durationMs: 6_500,
				question: {
					type: "trueFalse",
					text: "A capital do Brasil é Brasília",
				},
			},
		});
	});

	it("hides the correct answer until the results", async () => {
		const { deps, reach, answer } = await createStartedGame({
			players: ["Ana", "Bia", "Caio"],
		});
		const getHostGame = createGetHostGame(deps);

		await reach("answering");
		await answer(1, "choice-1");
		const open = await getHostGame(mine);

		expect(open.stage).toMatchObject({ answerCount: 1, distribution: null });
		expect(open.stage?.question?.choices).toEqual([
			{ id: "choice-1", shapeIndex: 0, text: "Brasília", correct: null },
			{ id: "choice-2", shapeIndex: 1, text: "Rio de Janeiro", correct: null },
			{ id: "choice-3", shapeIndex: 2, text: "Salvador", correct: null },
			{ id: "choice-4", shapeIndex: 3, text: "Recife", correct: null },
		]);
		expect(JSON.stringify(open)).not.toContain("true");
	});

	it("shows the distribution and the right answer in the results", async () => {
		const questions = [
			quizWith([choice("a"), choice("b"), choice("c", true), choice("d")]),
		];
		const { deps, reach, answer } = await createStartedGame({
			players: ["Ana", "Bia", "Caio", "Duda", "Eva"],
			questions,
		});
		await reach("answering");
		await answer(1, "choice-3");
		await answer(2, "choice-3");
		await answer(3, "choice-1");
		await answer(4, "choice-3");
		await reach("results");

		const { stage } = await createGetHostGame(deps)(mine);

		expect(stage).toMatchObject({
			phase: "results",
			remainingMs: null,
			answerCount: 4,
			distribution: [
				{ choiceId: "choice-1", count: 1 },
				{ choiceId: "choice-2", count: 0 },
				{ choiceId: "choice-3", count: 3 },
				{ choiceId: "choice-4", count: 0 },
			],
		});
		expect(stage?.question?.choices.map((entry) => entry.correct)).toEqual([
			false,
			false,
			true,
			false,
		]);
	});

	it("marks the right answer even when nobody chose it", async () => {
		const { deps, reach, answer } = await createStartedGame();
		await reach("answering");
		await answer(1, "choice-2");
		await reach("results");

		const { stage } = await createGetHostGame(deps)(mine);

		expect(stage?.distribution?.[0]).toEqual({
			choiceId: "choice-1",
			count: 0,
		});
		expect(stage?.question?.choices[0]?.correct).toBe(true);
	});

	it("shows true/false as two answers, the right one marked in the results", async () => {
		const { deps, reach } = await createStartedGame({
			questions: [aTrueFalseQuestion({ correct: false })],
		});
		await reach("results");

		const { stage } = await createGetHostGame(deps)(mine);

		expect(stage?.question?.choices).toEqual([
			{ id: "true", shapeIndex: 1, text: "Verdadeiro", correct: false },
			{ id: "false", shapeIndex: 0, text: "Falso", correct: true },
		]);
		expect(stage?.distribution).toHaveLength(2);
	});

	it("shows only the filled answers", async () => {
		const { deps, reach } = await createStartedGame({
			questions: [
				quizWith([choice("a", true), choice("b"), choice(null), choice("d")]),
			],
		});
		await reach("answering");

		const { stage } = await createGetHostGame(deps)(mine);

		expect(stage?.question?.choices.map((entry) => entry.shapeIndex)).toEqual([
			0, 1, 3,
		]);
	});

	it("gives the image its public URL, placement and crop", async () => {
		const [first] = somePlayableQuestions();
		const crop = { shape: "square" as const, zoom: 1.5, x: 0.5, y: 0.5 };
		const { deps, reach } = await createStartedGame({
			questions: [
				{
					...(first as ReturnType<typeof aQuestion>),
					image: {
						key: "quizzes/quiz-1/questions/mapa.png",
						placement: "media",
						crop,
						altText: "Mapa do Brasil",
					},
				},
			],
		});
		await reach("answering");

		const { stage } = await createGetHostGame(deps)(mine);

		expect(stage?.question?.image).toEqual({
			url: "https://media.test/quizzes/quiz-1/questions/mapa.png",
			placement: "media",
			crop,
			altText: "Mapa do Brasil",
		});
	});

	it("shows the time that is really left", async () => {
		const { deps, reach } = await createStartedGame();
		await reach("answering");
		deps.clock.advanceBy(8_000);

		const { stage } = await createGetHostGame(deps)(mine);

		expect(stage).toMatchObject({ remainingMs: 12_000, durationMs: 20_000 });
	});

	it("shows a finished game without a stage", async () => {
		const { deps, finish } = await createStartedGame();
		await finish();

		expect(await createGetHostGame(deps)(mine)).toMatchObject({
			status: "finished",
			endReason: null,
			questionCount: 2,
			stage: null,
		});
	});
});

/** A quiz question of 20 s whose first answer is right. */
const capital = (overrides: Parameters<typeof aQuestion>[0] = {}): Question =>
	quizWith(
		[choice("a", true), choice("b"), choice("c"), choice("d")],
		overrides,
	);

describe("getHostGame: the scoreboard (spec 010)", () => {
	const names = ["Ana", "Bia", "Caio", "Duda", "Eva", "Fábio", "Gil"];
	/** A row of the first question's scoreboard: nothing to start from. */
	const first = (
		playerId: string,
		nickname: string,
		total: number,
		rank: number,
	) => ({ playerId, nickname, total, rank, climbed: false, previous: null });
	/** The default two questions and one more, so the second has a scoreboard. */
	const threeQuestions = () => [
		...somePlayableQuestions(),
		capital({ id: "question-3" }),
	];

	it("has no scoreboard before the scoreboard phase", async () => {
		const { deps, reach, answer } = await createStartedGame();
		await reach("answering");
		await answer(1, "choice-1");
		await reach("results");

		const { stage } = await createGetHostGame(deps)(mine);

		expect(stage?.scoreboard).toBeNull();
		expect(JSON.stringify(stage)).not.toContain("total");
	});

	it("shows the first five by total, without the question", async () => {
		const { deps, reach, answer } = await createStartedGame({ players: names });
		await reach("answering");
		// The later the answer, the fewer the points; Gil gets it wrong.
		for (const number of [3, 1, 6, 2, 5, 4]) {
			deps.clock.advanceBy(1_000);
			await answer(number, "choice-1");
		}
		await answer(7, "choice-2");
		await reach("scoreboard");

		const { stage } = await createGetHostGame(deps)(mine);

		expect(stage).toMatchObject({
			phase: "scoreboard",
			question: null,
			distribution: null,
			remainingMs: null,
		});
		expect(stage?.scoreboard).toEqual([
			first("p3", "Caio", 975, 1),
			first("p1", "Ana", 950, 2),
			first("p6", "Fábio", 925, 3),
			first("p2", "Bia", 900, 4),
			first("p5", "Eva", 875, 5),
		]);
		expect(stage?.scoreboardLeavers).toEqual([]);
	});

	it("shows everybody when there are few, zero included, ties by arrival", async () => {
		const { deps, reach } = await createStartedGame({
			players: ["Ana", "Bia", "Caio"],
		});
		await reach("scoreboard");

		const { stage } = await createGetHostGame(deps)(mine);

		expect(
			stage?.scoreboard?.map(({ nickname, total, rank }) => [
				nickname,
				total,
				rank,
			]),
		).toEqual([
			["Ana", 0, 1],
			["Bia", 0, 2],
			["Caio", 0, 3],
		]);
	});

	it("shows the same scoreboard on a reload, with no arrow when nobody climbed", async () => {
		const { deps, reach, answer } = await createStartedGame({
			questions: threeQuestions(),
		});
		await reach("answering");
		await answer(1, "choice-1");
		await reach("answering", 1);
		deps.clock.advanceBy(2_000);
		await answer(2, "true");
		deps.clock.advanceBy(6_000);
		await answer(1, "false");
		await reach("scoreboard", 1);
		const getHostGame = createGetHostGame(deps);

		const shown = (await getHostGame(mine)).stage?.scoreboard;
		const again = (await getHostGame(mine)).stage?.scoreboard;

		expect(shown).toEqual([
			{
				playerId: "p1",
				nickname: "Ana",
				total: 1000,
				rank: 1,
				climbed: false,
				previous: { rank: 1, total: 1000 },
			},
			{
				playerId: "p2",
				nickname: "Bia",
				total: 900,
				rank: 2,
				climbed: false,
				previous: { rank: 2, total: 0 },
			},
		]);
		expect(again).toEqual(shown);
	});

	it("gives the arrow to who went up, not to who went down", async () => {
		const { deps, reach, answer } = await createStartedGame({
			questions: threeQuestions(),
		});
		await reach("answering");
		deps.clock.advanceBy(10_000);
		await answer(1, "choice-1");
		await reach("answering", 1);
		await answer(2, "true");
		await reach("scoreboard", 1);

		const { stage } = await createGetHostGame(deps)(mine);

		expect(stage?.scoreboard).toEqual([
			{
				playerId: "p2",
				nickname: "Bia",
				total: 1000,
				rank: 1,
				climbed: true,
				previous: { rank: 2, total: 0 },
			},
			{
				playerId: "p1",
				nickname: "Ana",
				total: 750,
				rank: 2,
				climbed: false,
				previous: { rank: 1, total: 750 },
			},
		]);
	});

	it("a no-points question changes nothing in the scoreboard", async () => {
		const { deps, reach, answer } = await createStartedGame({
			questions: [
				capital(),
				capital({ id: "question-2", points: "noPoints" }),
				capital({ id: "question-3" }),
			],
		});
		await reach("answering");
		await answer(2, "choice-1");
		await reach("answering", 1);
		await answer(1, "choice-1");
		await reach("scoreboard", 1);

		const { stage } = await createGetHostGame(deps)(mine);

		expect(stage?.scoreboard).toEqual([
			{
				playerId: "p2",
				nickname: "Bia",
				total: 1000,
				rank: 1,
				climbed: false,
				previous: { rank: 1, total: 1000 },
			},
			{
				playerId: "p1",
				nickname: "Ana",
				total: 0,
				rank: 2,
				climbed: false,
				previous: { rank: 2, total: 0 },
			},
		]);
	});

	it("plays the reference game: Beto 2900, Ana 2850", async () => {
		const { deps, reach, finish, submitAnswer } = await createStartedGame({
			players: ["Ana", "Beto"],
			questions: [
				capital(),
				capital({ id: "question-2" }),
				capital({ id: "question-3", points: "double" }),
			],
		});
		/** Each player answers `seconds` after the answers open; null is a wrong answer. */
		async function play(
			questionIndex: number,
			ana: number,
			beto: number | null,
		) {
			await reach("answering", questionIndex);
			const answers = [
				{ number: 1, seconds: ana, choice: "choice-1" },
				{
					number: 2,
					seconds: beto ?? 1,
					choice: beto === null ? "choice-2" : "choice-1",
				},
			].sort((a, b) => a.seconds - b.seconds);
			let elapsed = 0;
			for (const { number, seconds, choice } of answers) {
				deps.clock.advanceBy(seconds * 1000 - elapsed);
				elapsed = seconds * 1000;
				await submitAnswer({
					gameId: "game-1",
					playerId: `p${number}`,
					secret: `s${number}`,
					questionIndex,
					choiceIds: [choice],
				});
			}
		}
		await play(0, 4, 0.4);
		await play(1, 10, null);
		await play(2, 16, 2);
		// The last question goes straight to the podium (spec 011, CA-14).
		await finish();

		const { final } = await createGetHostGame(deps)(mine);

		expect(
			final?.standings.map(({ nickname, total, rank }) => [
				nickname,
				total,
				rank,
			]),
		).toEqual([
			["Beto", 2900, 1],
			["Ana", 2850, 2],
		]);
	});

	it("tells who left the first five (spec 011, RN-31)", async () => {
		const { deps, reach, answer } = await createStartedGame({
			players: names,
			questions: threeQuestions(),
		});
		await reach("answering");
		// Eva answers late, and Fábio and Gil do not answer.
		for (const number of [1, 2, 3, 4]) {
			deps.clock.advanceBy(1_000);
			await answer(number, "choice-1");
		}
		deps.clock.advanceBy(14_000);
		await answer(5, "choice-1");
		await reach("answering", 1);
		await answer(7, "true");
		await reach("scoreboard", 1);

		const { stage } = await createGetHostGame(deps)(mine);

		expect(stage?.scoreboard?.map((entry) => entry.nickname)).toEqual([
			"Gil",
			"Ana",
			"Bia",
			"Caio",
			"Duda",
		]);
		expect(stage?.scoreboard?.[0]).toMatchObject({
			climbed: true,
			previous: { rank: 7, total: 0 },
		});
		expect(stage?.scoreboardLeavers).toEqual([
			{
				playerId: "p5",
				nickname: "Eva",
				total: 550,
				rank: 6,
				climbed: false,
				previous: { rank: 5, total: 550 },
			},
		]);
	});
});

describe("getHostGame: the podium (spec 011)", () => {
	const names = ["Ana", "Bia", "Caio", "Duda", "Eva", "Fábio", "Gil"];

	it("a finished game has the final standings of everybody", async () => {
		const { deps, reach, answer, finish } = await createStartedGame({
			players: names,
			questions: [capital()],
		});
		await reach("answering");
		for (const number of [3, 1, 6, 2, 5, 4]) {
			deps.clock.advanceBy(1_000);
			await answer(number, "choice-1");
		}
		await answer(7, "choice-2");
		await finish();

		const view = await createGetHostGame(deps)(mine);

		expect(view).toMatchObject({ status: "finished", stage: null });
		expect(view.final?.standings).toEqual([
			{ playerId: "p3", nickname: "Caio", total: 975, rank: 1 },
			{ playerId: "p1", nickname: "Ana", total: 950, rank: 2 },
			{ playerId: "p6", nickname: "Fábio", total: 925, rank: 3 },
			{ playerId: "p2", nickname: "Bia", total: 900, rank: 4 },
			{ playerId: "p5", nickname: "Eva", total: 875, rank: 5 },
			{ playerId: "p4", nickname: "Duda", total: 850, rank: 6 },
			{ playerId: "p7", nickname: "Gil", total: 0, rank: 7 },
		]);
	});

	it("tells the time left of the reveal, by the server's clock", async () => {
		const { deps, finish } = await createStartedGame();
		const getHostGame = createGetHostGame(deps);
		await finish();

		expect((await getHostGame(mine)).final?.revealRemainingMs).toBe(7_000);
		deps.clock.advanceBy(2_500);
		expect((await getHostGame(mine)).final?.revealRemainingMs).toBe(4_500);
		// The next day the podium is still there, whole (RN-07, CA-13).
		deps.clock.advanceBy(24 * 60 * 60 * 1000);
		const reopened = await getHostGame(mine);
		expect(reopened.status).toBe("finished");
		expect(reopened.final?.revealRemainingMs).toBe(0);
		expect(reopened.final?.standings).toHaveLength(2);
	});

	it("ties and zeros stay in order of arrival", async () => {
		const { deps, finish } = await createStartedGame({
			players: ["Ana", "Bia", "Caio"],
		});
		await finish();

		const { final } = await createGetHostGame(deps)(mine);

		expect(
			final?.standings.map(({ nickname, total, rank }) => [
				nickname,
				total,
				rank,
			]),
		).toEqual([
			["Ana", 0, 1],
			["Bia", 0, 2],
			["Caio", 0, 3],
		]);
	});

	it("leaves out a player who was removed", async () => {
		const { deps, host, reach, answer, finish } = await createStartedGame({
			players: ["Ana", "Bia", "Caio"],
		});
		await reach("answering");
		await answer(1, "choice-1");
		deps.clock.advanceBy(4_000);
		await answer(2, "choice-1");
		await createRemovePlayer(deps)({ ...host, playerId: "p1" });
		await finish();

		const { final } = await createGetHostGame(deps)(mine);

		expect(final?.standings.map((entry) => entry.nickname)).toEqual([
			"Bia",
			"Caio",
		]);
	});

	it("a player who stopped answering stays in the count and in the final standings (spec 013)", async () => {
		// Bia's phone lost its connection after the first question.
		const { deps, reach, answer, finish } = await createStartedGame();
		await reach("answering");
		await answer(1, "choice-1");
		deps.clock.advanceBy(2_000);
		await answer(2, "choice-1");
		await reach("answering", 1);

		expect((await createGetHostGame(deps)(mine)).players).toHaveLength(2);

		await finish();

		const { final } = await createGetHostGame(deps)(mine);
		expect(
			final?.standings.map(({ nickname, total }) => [nickname, total]),
		).toEqual([
			["Ana", 1000],
			["Bia", 950],
		]);
	});

	it("only a finished game has a final", async () => {
		const playing = await createStartedGame();
		await playing.reach("results", 1);
		expect((await createGetHostGame(playing.deps)(mine)).final).toBeNull();

		const ended = await createStartedGame();
		await ended.reach("scoreboard");
		await createEndGame(ended.deps)(ended.host);
		expect(await createGetHostGame(ended.deps)(mine)).toMatchObject({
			status: "ended",
			final: null,
		});
	});
});

describe("getHostGame: options and who joined in the middle (spec 012)", () => {
	it("tells the game's options", async () => {
		const { deps, reach } = await createStartedGame({
			options: { showQuestionsOnDevices: true, randomizeAnswers: true },
		});
		await reach("answering");

		const view = await createGetHostGame(deps)(mine);

		expect(view.options).toEqual({
			showQuestionsOnDevices: true,
			randomizeQuestions: false,
			randomizeAnswers: true,
		});
	});

	it("counts who joined in the middle", async () => {
		const { deps, reach, join } = await createStartedGame();
		await reach("answering");

		await join("Caio");

		const view = await createGetHostGame(deps)(mine);
		expect(view.players.map((player) => player.nickname)).toEqual([
			"Ana",
			"Bia",
			"Caio",
		]);
	});
});
