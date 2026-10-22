import { describe, expect, it } from "vitest";

import type { Question } from "../../quiz/domain/question";
import {
	aPuzzleQuestion,
	aQuestion,
	aSliderQuestion,
	aTrueFalseQuestion,
	aTypeAnswerQuestion,
} from "../../quiz/testing/a-question";
import { aGame, aPlayer } from "../testing/a-game";
import {
	createGameDeps,
	markRemoved,
	somePlayableQuestions,
} from "../testing/game-deps";
import { createStartedGame } from "../testing/started-game";
import { createEndGame } from "./end-game";
import { createGetHostGame } from "./get-host-game";
import { createJoinGame } from "./join-game";
import { createSetGameOptions } from "./set-game-options";

const mine = { ownerId: "user-1", gameId: "game-1" };
/** Every test player's avatar (`aPlayer`). */
const hat = { character: "koala", accessory: "top-hat" };

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
		// The options are the host's own switches, not a hint of the answer.
		expect(JSON.stringify({ ...open, options: null })).not.toContain("true");
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
	) => ({
		playerId,
		nickname,
		avatar: hat,
		total,
		rank,
		climbed: false,
		previous: null,
	});
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
				avatar: hat,
				total: 1000,
				rank: 1,
				climbed: false,
				previous: { rank: 1, total: 1000 },
			},
			{
				playerId: "p2",
				nickname: "Bia",
				avatar: hat,
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
				avatar: hat,
				total: 1000,
				rank: 1,
				climbed: true,
				previous: { rank: 2, total: 0 },
			},
			{
				playerId: "p1",
				nickname: "Ana",
				avatar: hat,
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
				avatar: hat,
				total: 1000,
				rank: 1,
				climbed: false,
				previous: { rank: 1, total: 1000 },
			},
			{
				playerId: "p1",
				nickname: "Ana",
				avatar: hat,
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
				avatar: hat,
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
			{ playerId: "p3", nickname: "Caio", avatar: hat, total: 975, rank: 1 },
			{ playerId: "p1", nickname: "Ana", avatar: hat, total: 950, rank: 2 },
			{ playerId: "p6", nickname: "Fábio", avatar: hat, total: 925, rank: 3 },
			{ playerId: "p2", nickname: "Bia", avatar: hat, total: 900, rank: 4 },
			{ playerId: "p5", nickname: "Eva", avatar: hat, total: 875, rank: 5 },
			{ playerId: "p4", nickname: "Duda", avatar: hat, total: 850, rank: 6 },
			{ playerId: "p7", nickname: "Gil", avatar: hat, total: 0, rank: 7 },
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
		const { deps, reach, answer, finish } = await createStartedGame({
			players: ["Ana", "Bia", "Caio"],
		});
		await reach("answering");
		await answer(1, "choice-1");
		deps.clock.advanceBy(4_000);
		await answer(2, "choice-1");
		await markRemoved(deps, "p1");
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
			autoplay: false,
			gameCharacters: true,
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

describe("getHostGame: avatars (spec 028)", () => {
	const off = { gameCharacters: false };
	const fox = { character: "fox", accessory: null } as const;

	it("lobby players carry their avatar", async () => {
		const deps = createGameDeps();
		await deps.games.save(aGame({ createdAt: deps.clock.now() }));
		await deps.players.add(aPlayer({ avatar: fox }));

		const view = await createGetHostGame(deps)(mine);

		expect(view.players).toEqual([
			{ id: "player-1", nickname: "ACT", avatar: fox },
		]);
	});

	it("scoreboard and final standings carry avatars", async () => {
		const { deps, reach, answer, finish } = await createStartedGame({
			questions: [capital(), capital({ id: "question-2" })],
		});
		await reach("answering");
		await answer(1, "choice-1");
		await reach("scoreboard");

		const { stage } = await createGetHostGame(deps)(mine);
		expect(stage?.scoreboard?.map((row) => row.avatar)).toEqual([
			aPlayer().avatar,
			aPlayer().avatar,
		]);

		await finish();
		const { final } = await createGetHostGame(deps)(mine);
		expect(final?.standings.map((row) => row.avatar)).toEqual([
			aPlayer().avatar,
			aPlayer().avatar,
		]);
	});

	it("with characters off no view carries an avatar", async () => {
		const { deps, reach, answer, finish } = await createStartedGame({
			options: off,
			questions: [capital(), capital({ id: "question-2" })],
		});
		await reach("answering");
		await answer(1, "choice-1");
		await reach("scoreboard");

		const during = await createGetHostGame(deps)(mine);
		expect(during.players.map((row) => row.avatar)).toEqual([null, null]);
		expect(during.stage?.scoreboard?.map((row) => row.avatar)).toEqual([
			null,
			null,
		]);

		await finish();
		const { final } = await createGetHostGame(deps)(mine);
		expect(final?.standings.map((row) => row.avatar)).toEqual([null, null]);
	});

	it("turning characters back on shows the avatar of who joined while off", async () => {
		const deps = createGameDeps();
		await deps.games.save(
			aGame({
				createdAt: deps.clock.now(),
				options: { ...aGame().options, ...off },
			}),
		);
		const { playerId } = await createJoinGame(deps)({
			gameId: "game-1",
			nickname: "Ana",
		});
		await createSetGameOptions(deps)({
			...mine,
			options: { gameCharacters: true },
		});

		const view = await createGetHostGame(deps)(mine);

		expect(view.players).toEqual([
			{
				id: playerId,
				nickname: "Ana",
				avatar: { character: "moon", accessory: "fire" },
			},
		]);
	});
});

describe("getHostGame with a type answer (spec 031)", () => {
	async function typing() {
		const game = await createStartedGame({
			players: ["Ana", "Bia", "Caio"],
			questions: [
				aTypeAnswerQuestion({
					acceptedAnswers: ["The Colosseum", "Colosseum", "Colosseum in Rome"],
				}),
			],
		});
		await game.reach("answering");
		return game;
	}

	it("while answering a type answer, the host gets no accepted answers", async () => {
		const { deps } = await typing();

		const view = await createGetHostGame(deps)(mine);

		expect(view.stage).toMatchObject({
			phase: "answering",
			question: { type: "typeAnswer", choices: [] },
			typedAnswers: null,
		});
		expect(JSON.stringify(view)).not.toContain("Colosseum");
	});

	it("the results of a type answer carry the reveal tags with counts", async () => {
		const { deps, type, stage } = await typing();
		await type(1, "colosseum");
		await type(2, "COLOSSEUM");
		await type(3, "the coloseum");
		expect((await stage()).phase).toBe("results");

		const view = await createGetHostGame(deps)(mine);

		expect(view.stage?.typedAnswers?.tags).toEqual([
			{ text: "Colosseum", count: 2, correct: true },
			{ text: "The Colosseum", count: 0, correct: true },
			{ text: "Colosseum in Rome", count: 0, correct: true },
			{ text: "the coloseum", count: 1, correct: false },
		]);
		expect(view.stage?.reviewOpen).toBe(false);
	});

	it("reviewOpen tells an open review", async () => {
		const { deps, type, stage } = await typing();
		await type(1, "colosseum");
		await type(2, "x");
		await type(3, "y");
		await deps.games.saveReview("game-1", await stage(), {
			openedAt: deps.clock.now(),
			closedAt: null,
		});

		const view = await createGetHostGame(deps)(mine);

		expect(view.stage?.reviewOpen).toBe(true);
	});
});

describe("getHostGame with a slider (spec 032)", () => {
	async function sliding() {
		const game = await createStartedGame({
			players: ["Ana", "Bia", "Caio"],
			questions: [aSliderQuestion()],
		});
		await game.reach("answering");
		return game;
	}

	it("a slider's answers stage has the public scale", async () => {
		const { deps } = await sliding();

		const view = await createGetHostGame(deps)(mine);

		expect(view.stage).toMatchObject({
			phase: "answering",
			question: {
				type: "slider",
				choices: [],
				slider: { first: 104, last: 896, step: 8, unit: "anos" },
			},
			sliderResults: null,
		});
		expect(JSON.stringify(view)).not.toMatch(/"answer"|margin/);
	});

	it("a slider's results count the answers per position with the margin range", async () => {
		const { deps, slide, stage } = await sliding();
		await slide(1, 600);
		await slide(2, 640);
		await slide(3, 640);
		expect((await stage()).phase).toBe("results");

		const view = await createGetHostGame(deps)(mine);

		expect(view.stage?.sliderResults).toEqual({
			answer: 600,
			low: 520,
			high: 680,
			unit: "anos",
			counts: [
				{ value: 600, count: 1 },
				{ value: 640, count: 2 },
			],
		});
	});
});

describe("getHostGame with a puzzle (spec 033)", () => {
	async function ordering() {
		const game = await createStartedGame({
			players: ["Ana", "Bia", "Caio", "Davi", "Eva", "Fábio"],
			questions: [aPuzzleQuestion()],
		});
		await game.reach("answering");
		return game;
	}
	const right = ["choice-1", "choice-2", "choice-3", "choice-4"];
	const swapped = ["choice-1", "choice-2", "choice-4", "choice-3"];

	it("the host gets the puzzle's choices in the drawn order with their shapes", async () => {
		const { deps } = await ordering();

		const view = await createGetHostGame(deps)(mine);

		// The test shuffler draws backwards.
		expect(
			view.stage?.question?.choices.map(({ id, shapeIndex, text }) => [
				id,
				shapeIndex,
				text,
			]),
		).toEqual([
			["choice-4", 0, "Mississipi"],
			["choice-3", 1, "Yangtzé"],
			["choice-2", 2, "Amazonas"],
			["choice-1", 3, "Nilo"],
		]);
		expect(view.stage?.puzzleResults).toBeNull();
	});

	it("the results of a puzzle have the right order and the right and wrong counts", async () => {
		const { deps, answer, reach } = await ordering();
		await answer(1, ...right);
		await answer(2, ...right);
		await answer(3, ...right);
		await answer(4, ...swapped);
		await answer(5, ...swapped);
		await reach("results");

		const view = await createGetHostGame(deps)(mine);

		expect(view.stage?.puzzleResults).toEqual({
			order: right,
			correct: 3,
			wrong: 2,
		});
	});
});
