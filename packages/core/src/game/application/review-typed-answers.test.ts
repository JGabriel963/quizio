import { describe, expect, it } from "vitest";

import { aTypeAnswerQuestion } from "../../quiz/testing/a-question";
import { GAME_EVENTS } from "../domain/game-events";
import {
	AnswerNotReviewableError,
	ReviewNotAvailableError,
} from "../domain/typed-answer-review";
import { createStartedGame } from "../testing/started-game";
import { createOpenAnswerReview } from "./answer-review";
import { createReviewTypedAnswers } from "./review-typed-answers";

const mine = { ownerId: "user-1", gameId: "game-1" };

/** Ana types "pedro" at 3 s, Bia "pedra" at 15 s and Caio "Pedra!" at 15 s, of 30 s. */
async function inResults(
	options: { autoplay?: boolean; questionCount?: 1 | 2 } = {},
) {
	const questions = [
		aTypeAnswerQuestion({ acceptedAnswers: ["Pedro"], timeLimitSeconds: 30 }),
		aTypeAnswerQuestion({ id: "q2", timeLimitSeconds: 30 }),
	].slice(0, options.questionCount ?? 2);
	const game = await createStartedGame({
		players: ["Ana", "Bia", "Caio"],
		options: { autoplay: options.autoplay ?? false },
		questions,
	});
	await game.reach("answering");
	game.deps.clock.advanceBy(3_000);
	await game.type(1, "pedro");
	game.deps.clock.advanceBy(12_000);
	await game.type(2, "pedra");
	await game.type(3, "Pedra!");
	const review = createReviewTypedAnswers(game.deps);
	return { ...game, review };
}

describe("reviewTypedAnswers (spec 031, RN-29, RN-30, RN-30a)", () => {
	it("accepting an answer rescores everyone who sent it by their stored response time", async () => {
		const { deps, stage, review } = await inResults();

		await review({
			...mine,
			from: await stage(),
			changes: [{ key: "pedra", correct: true }],
		});

		const answers = await deps.answers.listByQuestion("game-1", 0);
		expect(
			answers.map(({ playerId, correctness, points, reviewedAt }) => ({
				playerId,
				correctness,
				points,
				reviewed: reviewedAt !== null,
			})),
		).toEqual([
			{ playerId: "p1", correctness: "correct", points: 950, reviewed: false },
			{ playerId: "p2", correctness: "correct", points: 750, reviewed: true },
			{ playerId: "p3", correctness: "correct", points: 750, reviewed: true },
		]);
	});

	it("marking an answer wrong takes its points away", async () => {
		const { deps, stage, review } = await inResults();
		// As if an earlier mark had made "pedra" right.
		await deps.answers.regrade(
			"game-1",
			0,
			[
				{ playerId: "p2", correctness: "correct", points: 750 },
				{ playerId: "p3", correctness: "correct", points: 750 },
			],
			deps.clock.now(),
		);

		await review({
			...mine,
			from: await stage(),
			changes: [{ key: "pedra", correct: false }],
		});

		expect(await deps.answers.find("game-1", 0, "p2")).toMatchObject({
			correctness: "wrong",
			points: 0,
		});
	});

	it("moves to the scoreboard with the new totals", async () => {
		const { stage, review } = await inResults();

		const view = await review({
			...mine,
			from: await stage(),
			changes: [{ key: "pedra", correct: true }],
		});

		expect(view.stage?.phase).toBe("scoreboard");
		expect(
			view.stage?.scoreboard?.map(({ nickname, total }) => [nickname, total]),
		).toEqual([
			["Ana", 950],
			["Bia", 750],
			["Caio", 750],
		]);
	});

	it("on the last question it finishes the game with the new points", async () => {
		const { stage, review } = await inResults({ questionCount: 1 });

		const view = await review({
			...mine,
			from: await stage(),
			changes: [{ key: "pedra", correct: true }],
		});

		expect(view.status).toBe("finished");
		expect(
			view.final?.standings.map(({ nickname, total }) => [nickname, total]),
		).toEqual([
			["Ana", 950],
			["Bia", 750],
			["Caio", 750],
		]);
	});

	it("passes the autoplay deadline", async () => {
		const { deps, stage, review } = await inResults({ autoplay: true });
		const from = await stage();
		await createOpenAnswerReview(deps)({ ...mine, from });

		const view = await review({
			...mine,
			from,
			changes: [{ key: "pedra", correct: true }],
		});

		expect(view.stage?.phase).toBe("scoreboard");
	});

	it("refuses after advancing", async () => {
		const { stage, reach, review } = await inResults();
		const from = await stage();
		await reach("scoreboard");

		await expect(
			review({ ...mine, from, changes: [{ key: "pedra", correct: true }] }),
		).rejects.toThrow(ReviewNotAvailableError);
	});

	it("of two submits only one regrades", async () => {
		const { deps, stage, review } = await inResults();
		const from = await stage();
		await review({ ...mine, from, changes: [{ key: "pedra", correct: true }] });

		await expect(
			review({ ...mine, from, changes: [{ key: "pedra", correct: false }] }),
		).rejects.toThrow(ReviewNotAvailableError);
		expect(await deps.answers.find("game-1", 0, "p2")).toMatchObject({
			correctness: "correct",
		});
	});

	it("refuses a change to an accepted answer", async () => {
		const { stage, review } = await inResults();

		await expect(
			review({
				...mine,
				from: await stage(),
				changes: [{ key: "pedro", correct: false }],
			}),
		).rejects.toThrow(AnswerNotReviewableError);
	});

	it("publishes the stage after regrading", async () => {
		const { deps, stage, review } = await inResults();

		await review({
			...mine,
			from: await stage(),
			changes: [{ key: "pedra", correct: true }],
		});

		expect(deps.realtime.messages.at(-1)).toMatchObject({
			event: GAME_EVENTS.stageChanged,
		});
	});
});
