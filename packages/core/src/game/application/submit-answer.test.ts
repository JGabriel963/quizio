import { describe, expect, it } from "vitest";
import { aQuestion } from "../../quiz/testing/a-question";
import {
	AlreadyAnsweredError,
	AnswersClosedError,
	InvalidAnswerError,
} from "../domain/answer";
import { type Game, GameNotFoundError } from "../domain/game";
import { GAME_EVENTS } from "../domain/game-events";
import { HOST_AWAY_AFTER_MS, isHostAway } from "../domain/host-presence";
import { createStartedGame } from "../testing/started-game";
import { createRemovePlayer } from "./remove-player";

const fromPlayer = (
	number: number,
	choiceIds: string[],
	questionIndex = 0,
) => ({
	gameId: "game-1",
	playerId: `p${number}`,
	secret: `s${number}`,
	questionIndex,
	choiceIds,
});

async function storedGame(deps: {
	games: { findById(id: string): Promise<Game | null> };
}): Promise<Game> {
	const game = await deps.games.findById("game-1");
	if (!game) {
		throw new Error("game-1 is gone");
	}
	return game;
}

async function answering(players = ["Ana", "Bia"]) {
	const game = await createStartedGame({ players });
	await game.reach("answering");
	return game;
}

describe("submitAnswer (spec 009)", () => {
	it("stores the answer with the server's time, its correctness and its points", async () => {
		const { deps, answer } = await answering();
		deps.clock.advanceBy(4_200);

		await answer(1, "choice-1");

		expect(await deps.answers.listByQuestion("game-1", 0)).toEqual([
			{
				gameId: "game-1",
				questionIndex: 0,
				playerId: "p1",
				choiceIds: ["choice-1"],
				responseTimeMs: 4_200,
				correctness: "correct",
				points: 895,
				receivedAt: deps.clock.now(),
			},
		]);
	});

	it("tells the host only how many answered", async () => {
		const { deps, answer } = await answering();

		await answer(1, "choice-2");

		expect(deps.realtime.messages.at(-1)).toEqual({
			channel: "game-game-1",
			event: GAME_EVENTS.answerCount,
			payload: { questionIndex: 0, count: 1 },
		});
	});

	it("takes one answer per question", async () => {
		const { deps, answer } = await answering();
		await answer(1, "choice-2");

		await expect(answer(1, "choice-1")).rejects.toThrow(AlreadyAnsweredError);

		expect(await deps.answers.find("game-1", 0, "p1")).toMatchObject({
			choiceIds: ["choice-2"],
			correctness: "wrong",
		});
	});

	it("accepts an answer within the grace and refuses one past it", async () => {
		const { deps, answer } = await answering();
		deps.clock.advanceBy(20_300);
		await answer(1, "choice-1");
		expect(await deps.answers.find("game-1", 0, "p1")).toMatchObject({
			responseTimeMs: 20_000,
		});

		deps.clock.advanceBy(700);
		await expect(answer(2, "choice-1")).rejects.toThrow(AnswersClosedError);
		expect(await deps.answers.countByQuestion("game-1", 0)).toBe(1);
	});

	it("refuses an answer outside the answers phase", async () => {
		const { submitAnswer, reach } = await createStartedGame();

		await reach("questionIntro");
		await expect(submitAnswer(fromPlayer(1, ["choice-1"]))).rejects.toThrow(
			AnswersClosedError,
		);

		await reach("results");
		await expect(submitAnswer(fromPlayer(1, ["choice-1"]))).rejects.toThrow(
			AnswersClosedError,
		);
	});

	it("refuses an answer for a question that is not the one being asked", async () => {
		const { submitAnswer, reach } = await createStartedGame();
		await reach("answering", 1);

		await expect(submitAnswer(fromPlayer(1, ["choice-1"], 0))).rejects.toThrow(
			AnswersClosedError,
		);
	});

	it("refuses a wrong secret, a removed player and a player of another game", async () => {
		const { deps, host, submitAnswer } = await answering([
			"Ana",
			"Bia",
			"Caio",
		]);
		await createRemovePlayer(deps)({ ...host, playerId: "p2" });

		await expect(
			submitAnswer({ ...fromPlayer(1, ["choice-1"]), secret: "guess" }),
		).rejects.toThrow(GameNotFoundError);
		await expect(submitAnswer(fromPlayer(2, ["choice-1"]))).rejects.toThrow(
			GameNotFoundError,
		);
		await expect(
			submitAnswer({ ...fromPlayer(1, ["choice-1"]), gameId: "game-9" }),
		).rejects.toThrow(GameNotFoundError);
		expect(await deps.answers.countByQuestion("game-1", 0)).toBe(0);
	});

	it("refuses an answer that is not of the question", async () => {
		const { answer } = await answering();

		await expect(answer(1, "choice-9")).rejects.toThrow(InvalidAnswerError);
		await expect(answer(1, "choice-1", "choice-2")).rejects.toThrow(
			InvalidAnswerError,
		);
	});

	it("closes the answers when everybody answered", async () => {
		const { deps, answer, stage } = await answering();
		deps.clock.advanceBy(5_000);
		await answer(1, "choice-1");
		expect(await stage()).toEqual({ questionIndex: 0, phase: "answering" });

		await answer(2, "choice-3");

		expect(await stage()).toEqual({ questionIndex: 0, phase: "results" });
		expect(deps.realtime.messages.at(-1)).toMatchObject({
			event: GAME_EVENTS.stageChanged,
			payload: { status: "playing", stage: { phase: "results" } },
		});
	});

	it("the answers stay open while someone has not answered (spec 013)", async () => {
		// Bia's phone lost its connection: the question waits for her to its end.
		const { deps, answer, stage, advance, host } = await answering();
		await answer(1, "choice-1");
		deps.clock.advanceBy(19_000);

		expect(await stage()).toEqual({ questionIndex: 0, phase: "answering" });

		deps.clock.advanceBy(1_000);
		await advance({ ...host, from: await stage() });

		expect(await stage()).toEqual({ questionIndex: 0, phase: "results" });
	});

	it("an answer counts while the host is away (spec 013)", async () => {
		const { deps, answer } = await answering();
		// The host's screen gave no sign for longer than the limit.
		deps.clock.advanceBy(HOST_AWAY_AFTER_MS + 2_000);
		expect(isHostAway(await storedGame(deps), deps.clock.now())).toBe(true);

		await answer(1, "choice-1");

		expect(await deps.answers.listByPlayer("game-1", "p1")).toMatchObject([
			{ questionIndex: 0, correctness: "correct", responseTimeMs: 12_000 },
		]);
	});

	it("does not wait for a player who was removed", async () => {
		const { deps, host, answer, stage } = await answering();
		await createRemovePlayer(deps)({ ...host, playerId: "p2" });

		await answer(1, "choice-1");

		expect((await stage()).phase).toBe("results");
	});

	it("a finished game takes no answer", async () => {
		const { submitAnswer, finish } = await createStartedGame();
		await finish();

		await expect(submitAnswer(fromPlayer(1, ["true"], 1))).rejects.toThrow(
			AnswersClosedError,
		);
	});

	it("scores by speed, and nothing for a wrong answer", async () => {
		const { deps, answer } = await answering(["Ana", "Bia", "Caio"]);
		deps.clock.advanceBy(5_000);
		await answer(1, "choice-1");
		deps.clock.advanceBy(7_000);
		await answer(2, "choice-1");
		await answer(3, "choice-2");

		const points = (await deps.answers.listByQuestion("game-1", 0)).map(
			(entry) => entry.points,
		);

		expect(points).toEqual([875, 700, 0]);
	});

	it("an answer within the grace scores as one at the time limit", async () => {
		const { deps, answer } = await answering();
		deps.clock.advanceBy(20_300);

		await answer(1, "choice-1");

		expect(await deps.answers.find("game-1", 0, "p1")).toMatchObject({
			points: 500,
		});
	});

	it("the streak gives no points", async () => {
		const { deps, reach, answer } = await createStartedGame();
		await reach("answering");
		await answer(1, "choice-1");
		await reach("answering", 1);
		deps.clock.advanceBy(5_000);

		// Ana comes from a right answer, Bia from none: same instant, same points.
		await answer(1, "true");
		await answer(2, "true");

		const [ana, bia] = await deps.answers.listByQuestion("game-1", 1);
		expect(ana?.points).toBe(750);
		expect(bia?.points).toBe(750);
	});

	describe("with players who joined in the middle (spec 012)", () => {
		it("refuses an answer to a question before the player's first", async () => {
			const { deps, join, submitAnswer } = await answering();
			const caio = await join("Caio");

			await expect(
				submitAnswer({ ...caio, questionIndex: 0, choiceIds: ["choice-1"] }),
			).rejects.toThrow(AnswersClosedError);
			expect(await deps.answers.countByQuestion("game-1", 0)).toBe(0);
		});

		it("closes the answers without waiting for who joined late", async () => {
			const { join, answer, stage } = await answering();
			await join("Caio");

			await answer(1, "choice-1");
			await answer(2, "choice-3");

			expect(await stage()).toEqual({ questionIndex: 0, phase: "results" });
		});

		it("waits for who joined before the answers opened", async () => {
			const { join, reach, answer, stage, submitAnswer } =
				await createStartedGame();
			await reach("questionIntro");
			const caio = await join("Caio");
			await reach("answering");

			await answer(1, "choice-1");
			await answer(2, "choice-3");
			expect((await stage()).phase).toBe("answering");

			await submitAnswer({
				...caio,
				questionIndex: 0,
				choiceIds: ["choice-1"],
			});

			expect((await stage()).phase).toBe("results");
		});

		it("who joined late answers the next question", async () => {
			const { join, reach, answer, stage, submitAnswer } = await answering();
			const caio = await join("Caio");
			await reach("answering", 1);

			await answer(1, "true");
			await answer(2, "false");
			expect((await stage()).phase).toBe("answering");

			await submitAnswer({ ...caio, questionIndex: 1, choiceIds: ["true"] });

			expect((await stage()).phase).toBe("results");
		});
	});

	it("scores each right answer marked in a multiple selection (spec 012, CA-37)", async () => {
		const { deps, reach, answer } = await createStartedGame({
			players: ["Ana", "Bia", "Caio"],
			questions: [
				aQuestion({
					selection: "multiple",
					timeLimitSeconds: 30,
					choices: ["a", "b", "c", "d"].map((text, index) => ({
						id: `choice-${index + 1}`,
						text,
						correct: index < 3,
					})),
				}),
			],
		});
		await reach("answering");
		deps.clock.advanceBy(8_000);

		await answer(1, "choice-1", "choice-2", "choice-3");
		await answer(2, "choice-1", "choice-2");
		await answer(3, "choice-1", "choice-2", "choice-4");

		expect(
			(await deps.answers.listByQuestion("game-1", 0)).map((entry) => [
				entry.correctness,
				entry.points,
			]),
		).toEqual([
			["correct", 2600],
			["partiallyCorrect", 1733],
			["wrong", 0],
		]);
	});
});
