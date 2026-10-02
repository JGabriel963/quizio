import { describe, expect, it } from "vitest";

import { aQuestion } from "../../quiz/testing/a-question";
import {
	GameEndedError,
	GameNotFoundError,
	QuizNotPlayableError,
} from "../domain/game";
import { GAME_EVENTS, gameChannel } from "../domain/game-events";
import { DEFAULT_GAME_OPTIONS, type GameOptions } from "../domain/game-options";
import { GameHasNoPlayersError } from "../domain/game-progress";
import { aGame, aPlayer } from "../testing/a-game";
import { createGameDeps, somePlayableQuestions } from "../testing/game-deps";
import { createEndGame } from "./end-game";
import { createGetHostGame } from "./get-host-game";
import { createHostGame } from "./host-game";
import { createStartGame } from "./start-game";

const mine = { ownerId: "user-1", gameId: "game-1" };

async function lobby(playerCount = 2, options: Partial<GameOptions> = {}) {
	const deps = createGameDeps();
	await deps.games.save(
		aGame({
			createdAt: deps.clock.now(),
			options: { ...DEFAULT_GAME_OPTIONS, ...options },
		}),
	);
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

	describe("in a drawn order (spec 012)", () => {
		// The test shuffler hands every list back backwards.
		it("plays the questions in the drawn order", async () => {
			const deps = await lobby(2, { randomizeQuestions: true });

			const view = await createStartGame(deps)(mine);

			expect(view.questionCount).toBe(2);
			expect(deps.gameQuestions.allOf("game-1")).toMatchObject([
				{ index: 0, type: "trueFalse" },
				{ index: 1, type: "quiz", text: "Qual é a capital do Brasil?" },
			]);
			// The answers stay where the editor put them.
			expect(
				deps.gameQuestions
					.allOf("game-1")[1]
					?.choices.map((choice) => choice.text),
			).toEqual(["Brasília", "Rio de Janeiro", "Salvador", "Recife"]);
		});

		it("plays the answers in the drawn positions", async () => {
			const deps = await lobby(2, { randomizeAnswers: true });

			await createStartGame(deps)(mine);

			const [quiz, trueFalse] = deps.gameQuestions.allOf("game-1");
			expect(quiz?.choices).toEqual([
				{ id: "choice-4", shapeIndex: 0, text: "Recife", correct: false },
				{ id: "choice-3", shapeIndex: 1, text: "Salvador", correct: false },
				{
					id: "choice-2",
					shapeIndex: 2,
					text: "Rio de Janeiro",
					correct: false,
				},
				{ id: "choice-1", shapeIndex: 3, text: "Brasília", correct: true },
			]);
			// "Verdadeiro" stays the blue diamond (RN-24).
			expect(trueFalse?.choices.map((choice) => choice.shapeIndex)).toEqual([
				1, 0,
			]);
		});

		it("the same order is read again after the start", async () => {
			const deps = await lobby(2, {
				randomizeQuestions: true,
				randomizeAnswers: true,
			});
			const startGame = createStartGame(deps);
			await startGame(mine);
			const drawn = deps.gameQuestions.allOf("game-1");

			// A repeated "Iniciar" and a reload draw nothing again.
			await startGame(mine);
			await createGetHostGame(deps)(mine);

			expect(deps.gameQuestions.allOf("game-1")).toEqual(drawn);
			expect(deps.shuffler.calls).toBe(2);
		});

		it("leaves the quiz as it was", async () => {
			const deps = await lobby(2, {
				randomizeQuestions: true,
				randomizeAnswers: true,
			});

			await createStartGame(deps)(mine);

			expect(deps.versionQuestions.get(1)).toEqual(somePlayableQuestions());
		});

		it("both options off keep the editor's order", async () => {
			const deps = await lobby();

			await createStartGame(deps)(mine);

			expect(deps.shuffler.calls).toBe(0);
			expect(
				deps.gameQuestions
					.allOf("game-1")[0]
					?.choices.map((choice) => choice.id),
			).toEqual(["choice-1", "choice-2", "choice-3", "choice-4"]);
		});

		it("playing again draws again with the same options", async () => {
			const deps = await lobby(2, { randomizeQuestions: true });
			await deps.preferences.save("user-1", {
				...DEFAULT_GAME_OPTIONS,
				randomizeQuestions: true,
			});
			const startGame = createStartGame(deps);
			await startGame(mine);
			expect(deps.shuffler.calls).toBe(1);

			const again = await createHostGame(deps)({
				ownerId: "user-1",
				quizId: "quiz-1",
			});
			await deps.players.add(
				aPlayer({ id: "again-1", gameId: again.gameId, nickname: "Ana" }),
			);
			await startGame({ ownerId: "user-1", gameId: again.gameId });

			expect(deps.shuffler.calls).toBe(2);
			expect((await deps.games.findById(again.gameId))?.options).toMatchObject({
				randomizeQuestions: true,
			});
			expect(deps.gameQuestions.allOf(again.gameId)).toMatchObject([
				{ index: 0, type: "trueFalse" },
				{ index: 1, type: "quiz" },
			]);
		});
	});
});
