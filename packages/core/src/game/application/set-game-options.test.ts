import { describe, expect, it } from "vitest";

import { GameEndedError, GameNotFoundError } from "../domain/game";
import {
	DEFAULT_GAME_OPTIONS,
	GameOptionsFixedError,
} from "../domain/game-options";
import { aGame } from "../testing/a-game";
import { createGameDeps } from "../testing/game-deps";
import { aPlayableQuiz } from "../testing/in-memory-playable-quiz-query";
import { createStartedGame } from "../testing/started-game";
import { createEndGame } from "./end-game";
import { createHostGame } from "./host-game";
import { createSetGameLocked } from "./set-game-locked";
import { createSetGameOptions } from "./set-game-options";

const mine = { ownerId: "user-1", gameId: "game-1" };

async function lobby() {
	const deps = createGameDeps({
		quizzes: [aPlayableQuiz(), aPlayableQuiz({ id: "quiz-2" })],
		pins: ["265914", "569177"],
	});
	await deps.games.save(aGame({ createdAt: deps.clock.now() }));
	return deps;
}

describe("setGameOptions (spec 012)", () => {
	it("changes the game and saves it for the next one", async () => {
		const deps = await lobby();

		const view = await createSetGameOptions(deps)({
			...mine,
			options: { showQuestionsOnDevices: true, randomizeAnswers: true },
		});

		const options = {
			showQuestionsOnDevices: true,
			randomizeQuestions: false,
			randomizeAnswers: true,
		};
		expect(view.options).toEqual(options);
		expect((await deps.games.findById("game-1"))?.options).toEqual(options);
		expect(await deps.preferences.find("user-1")).toEqual(options);

		// A game of another quiz starts with them (CA-04).
		const { gameId } = await createHostGame(deps)({
			ownerId: "user-1",
			quizId: "quiz-2",
		});
		expect((await deps.games.findById(gameId))?.options).toEqual(options);
	});

	it("another host's options are untouched", async () => {
		const deps = await lobby();

		await createSetGameOptions(deps)({
			...mine,
			options: { randomizeQuestions: true },
		});

		expect(await deps.preferences.find("user-2")).toBeNull();
	});

	it("another owner's game does not exist", async () => {
		const deps = await lobby();
		const setGameOptions = createSetGameOptions(deps);

		await expect(
			setGameOptions({
				ownerId: "user-2",
				gameId: "game-1",
				options: { showQuestionsOnDevices: true },
			}),
		).rejects.toThrow(GameNotFoundError);
		expect((await deps.games.findById("game-1"))?.options).toEqual(
			DEFAULT_GAME_OPTIONS,
		);
		expect(await deps.preferences.find("user-2")).toBeNull();
	});

	it("refuses the random orders while the game is on", async () => {
		const { deps, host, reach } = await createStartedGame();
		await reach("answering");

		await expect(
			createSetGameOptions(deps)({
				...host,
				options: { randomizeQuestions: true },
			}),
		).rejects.toThrow(GameOptionsFixedError);
		expect(await deps.preferences.find("user-1")).toBeNull();
	});

	it("refuses an ended game", async () => {
		const deps = await lobby();
		await createEndGame(deps)(mine);

		await expect(
			createSetGameOptions(deps)({
				...mine,
				options: { showQuestionsOnDevices: true },
			}),
		).rejects.toThrow(GameEndedError);
	});

	it("changes showing the questions during the game, without moving its stage", async () => {
		const { deps, host, reach, stage } = await createStartedGame();
		await reach("answering");

		const view = await createSetGameOptions(deps)({
			...host,
			options: { showQuestionsOnDevices: true },
		});

		expect(view.options.showQuestionsOnDevices).toBe(true);
		expect(view.stage).toMatchObject({ questionIndex: 0, phase: "answering" });
		expect(await stage()).toEqual({ questionIndex: 0, phase: "answering" });
	});

	it("does not undo an advance written meanwhile", async () => {
		const { deps, host, reach, stage } = await createStartedGame();
		await reach("answering");
		// The request reads the game, and the answers close before it writes.
		const findById = deps.games.findById.bind(deps.games);
		let raced = false;
		deps.games.findById = async (id) => {
			const game = await findById(id);
			if (!raced) {
				raced = true;
				await reach("results");
			}
			return game;
		};

		const view = await createSetGameOptions(deps)({
			...host,
			options: { showQuestionsOnDevices: true },
		});

		expect(await stage()).toEqual({ questionIndex: 0, phase: "results" });
		expect(view.stage?.phase).toBe("results");
		expect(view.options.showQuestionsOnDevices).toBe(true);
	});

	it("does not save the lock", async () => {
		const deps = await lobby();
		await createSetGameLocked(deps)({ ...mine, locked: true });
		await createSetGameOptions(deps)({
			...mine,
			options: { showQuestionsOnDevices: true },
		});

		const { gameId } = await createHostGame(deps)({
			ownerId: "user-1",
			quizId: "quiz-2",
		});

		expect(await deps.games.findById(gameId)).toMatchObject({
			locked: false,
			options: { showQuestionsOnDevices: true },
		});
		// And the lock of the first game stayed as the host left it.
		expect((await deps.games.findById("game-1"))?.locked).toBe(true);
	});
});
