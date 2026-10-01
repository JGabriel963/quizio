import { describe, expect, it } from "vitest";

import { aQuestion } from "../../quiz/testing/a-question";
import { createStartedGame } from "../testing/started-game";
import { createEndGame } from "./end-game";
import { createGetPlayerSession } from "./get-player-session";

const player = (number: number) => ({
	gameId: "game-1",
	playerId: `p${number}`,
	secret: `s${number}`,
});

/** Answers 1 and 2 are right. */
const multipleChoice = aQuestion({
	selection: "multiple",
	choices: ["a", "b", "c", "d"].map((text, index) => ({
		id: `choice-${index + 1}`,
		text,
		correct: index < 2,
	})),
});

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
				answered: false,
				result: null,
			},
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
				choices: [
					{ id: "choice-1", shapeIndex: 0, label: null },
					{ id: "choice-2", shapeIndex: 1, label: null },
					{ id: "choice-3", shapeIndex: 2, label: null },
					{ id: "choice-4", shapeIndex: 3, label: null },
				],
			},
			answered: false,
			result: null,
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
			result: null,
		});
		expect((await getPlayerSession(player(2))).stage).toMatchObject({
			answered: false,
			result: null,
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

		expect(views.map((view) => view.stage?.result)).toEqual([
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

		const results = await Promise.all(
			[1, 2, 3].map(
				async (n) => (await getPlayerSession(player(n))).stage?.result,
			),
		);

		expect(results).toEqual(["correct", "partiallyCorrect", "wrong"]);
	});

	it("is finished after the last question, and ended when the host closes it", async () => {
		const finished = await createStartedGame();
		await finished.reach("results", 1);
		await finished.advance({
			...finished.host,
			from: { questionIndex: 1, phase: "results" },
		});
		expect(
			await createGetPlayerSession(finished.deps)(player(1)),
		).toMatchObject({ status: "finished", stage: null });

		const ended = await createStartedGame();
		await ended.reach("answering");
		await createEndGame(ended.deps)(ended.host);
		expect(await createGetPlayerSession(ended.deps)(player(1))).toMatchObject({
			status: "ended",
			stage: null,
		});
	});
});
