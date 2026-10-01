import { describe, expect, it } from "vitest";

import { aQuestion } from "../../quiz/testing/a-question";
import {
	GameEndedError,
	GameNotFoundError,
	QuizNotPlayableError,
} from "../domain/game";
import { GAME_EVENTS, gameChannel } from "../domain/game-events";
import { GameHasNoPlayersError } from "../domain/game-progress";
import { aGame, aPlayer } from "../testing/a-game";
import { createGameDeps } from "../testing/game-deps";
import { createEndGame } from "./end-game";
import { createStartGame } from "./start-game";

const mine = { ownerId: "user-1", gameId: "game-1" };

async function lobby(playerCount = 2) {
	const deps = createGameDeps();
	await deps.games.save(aGame({ createdAt: deps.clock.now() }));
	for (let index = 1; index <= playerCount; index++) {
		await deps.players.add(
			aPlayer({ id: `p${index}`, nickname: `Jogador ${index}` }),
		);
	}
	return deps;
}

describe("startGame (spec 009)", () => {
	it("copies the questions and opens the game intro", async () => {
		const deps = await lobby();

		const view = await createStartGame(deps)(mine);

		expect(view).toMatchObject({
			status: "playing",
			questionCount: 2,
			stage: {
				questionIndex: 0,
				phase: "gameIntro",
				remainingMs: 3_000,
				durationMs: 3_000,
				question: null,
				answerCount: 0,
				distribution: null,
			},
		});
		expect(await deps.games.findById("game-1")).toMatchObject({
			status: "playing",
			questionCount: 2,
			progress: {
				questionIndex: 0,
				phase: "gameIntro",
				phaseStartedAt: deps.clock.now(),
			},
		});
		expect(deps.gameQuestions.allOf("game-1")).toMatchObject([
			{ index: 0, type: "quiz", text: "Qual é a capital do Brasil?" },
			{ index: 1, type: "trueFalse", timeLimitSeconds: 10 },
		]);
	});

	it("tells the screens, without any question yet", async () => {
		const deps = await lobby();

		await createStartGame(deps)(mine);

		expect(deps.realtime.messagesOn(gameChannel("game-1"))).toEqual([
			{
				channel: gameChannel("game-1"),
				event: GAME_EVENTS.stageChanged,
				payload: {
					status: "playing",
					stage: {
						questionIndex: 0,
						questionCount: 2,
						phase: "gameIntro",
						durationMs: 3_000,
						question: null,
					},
				},
			},
		]);
	});

	it("needs a player", async () => {
		const deps = await lobby(0);

		await expect(createStartGame(deps)(mine)).rejects.toThrow(
			GameHasNoPlayersError,
		);
		expect(await deps.games.findById("game-1")).toMatchObject({
			status: "lobby",
		});
	});

	it("does not count removed players", async () => {
		const deps = await lobby(0);
		await deps.players.add(aPlayer({ removedAt: deps.clock.now() }));

		await expect(createStartGame(deps)(mine)).rejects.toThrow(
			GameHasNoPlayersError,
		);
	});

	it("is not found for another creator", async () => {
		const deps = await lobby();

		await expect(
			createStartGame(deps)({ ownerId: "user-2", gameId: "game-1" }),
		).rejects.toThrow(GameNotFoundError);
		expect(await deps.games.findById("game-1")).toMatchObject({
			status: "lobby",
		});
	});

	it("starting twice keeps the stage", async () => {
		const deps = await lobby();
		const startGame = createStartGame(deps);
		await startGame(mine);
		deps.clock.advanceBy(2_000);

		const view = await startGame(mine);

		expect(view.stage).toMatchObject({
			phase: "gameIntro",
			remainingMs: 1_000,
		});
		expect(deps.realtime.messages).toHaveLength(1);
	});

	it("does not start a game that was ended", async () => {
		const deps = await lobby();
		await createEndGame(deps)(mine);

		await expect(createStartGame(deps)(mine)).rejects.toThrow(GameEndedError);
	});

	it("uses the version the game was created with, whatever was saved later", async () => {
		const deps = await lobby();
		deps.versionQuestions.set(2, [aQuestion({ text: "Outra pergunta" })]);

		await createStartGame(deps)(mine);

		expect(deps.gameQuestions.allOf("game-1")).toHaveLength(2);
		// And nothing saved after the start reaches the game.
		deps.versionQuestions.set(1, [aQuestion({ text: "Mudou" })]);
		expect(deps.gameQuestions.allOf("game-1")[0]?.text).toBe(
			"Qual é a capital do Brasil?",
		);
	});

	it("refuses a version that is gone", async () => {
		const deps = await lobby();
		deps.versionQuestions.clear();

		await expect(createStartGame(deps)(mine)).rejects.toThrow(
			QuizNotPlayableError,
		);
	});
});
