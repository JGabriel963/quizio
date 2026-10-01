import { describe, expect, it } from "vitest";

import { aQuestion, aTrueFalseQuestion } from "../../quiz/testing/a-question";
import { somePlayableQuestions } from "../testing/game-deps";
import { createStartedGame } from "../testing/started-game";
import { createGetHostGame } from "./get-host-game";

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
				remainingMs: 5_000,
				durationMs: 5_000,
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
		const { deps, host, advance, reach } = await createStartedGame();
		await reach("results", 1);
		await advance({ ...host, from: { questionIndex: 1, phase: "results" } });

		expect(await createGetHostGame(deps)(mine)).toMatchObject({
			status: "finished",
			endReason: null,
			questionCount: 2,
			stage: null,
		});
	});
});
