import { describe, expect, it } from "vitest";

import { aTypeAnswerQuestion } from "../../quiz/testing/a-question";
import { GameNotFoundError } from "../domain/game";
import { ReviewNotAvailableError } from "../domain/typed-answer-review";
import { createStartedGame } from "../testing/started-game";
import {
	createCloseAnswerReview,
	createGetTypedAnswers,
	createOpenAnswerReview,
} from "./answer-review";

const mine = { ownerId: "user-1", gameId: "game-1" };

async function inResults(options: { autoplay?: boolean } = {}) {
	const game = await createStartedGame({
		players: ["Ana", "Bia", "Caio", "Davi"],
		options: { autoplay: options.autoplay ?? false },
		questions: [
			aTypeAnswerQuestion({ acceptedAnswers: ["Pedro", "Simão Pedro"] }),
			aTypeAnswerQuestion({ id: "q2" }),
		],
	});
	await game.reach("answering");
	await game.type(1, "pedro");
	await game.type(2, "Pedra");
	await game.type(3, "Paulo");
	await game.type(4, "pedra!");
	return game;
}

describe("openAnswerReview and closeAnswerReview (spec 031, RN-32)", () => {
	it("opening holds the autoplay countdown", async () => {
		const { deps, stage } = await inResults({ autoplay: true });

		const view = await createOpenAnswerReview(deps)({
			...mine,
			from: await stage(),
		});

		expect(view.stage).toMatchObject({ reviewOpen: true, autoAdvance: null });
	});

	it("opening twice keeps the first instant", async () => {
		const { deps, stage, stored } = await inResults({ autoplay: true });
		const from = await stage();
		const opened = deps.clock.now();
		await createOpenAnswerReview(deps)({ ...mine, from });
		deps.clock.advanceBy(3_000);

		await createOpenAnswerReview(deps)({ ...mine, from });

		expect((await stored()).progress?.reviewOpenedAt).toEqual(opened);
	});

	it("closing restarts the countdown", async () => {
		const { deps, stage } = await inResults({ autoplay: true });
		const from = await stage();
		await createOpenAnswerReview(deps)({ ...mine, from });
		deps.clock.advanceBy(60_000);

		const view = await createCloseAnswerReview(deps)({ ...mine, from });

		expect(view.stage).toMatchObject({
			reviewOpen: false,
			autoAdvance: { remainingMs: 5_000 },
		});
	});

	it("refuses outside the results of a type answer", async () => {
		const { deps, stage, reach } = await inResults();
		await reach("scoreboard");

		await expect(
			createOpenAnswerReview(deps)({ ...mine, from: await stage() }),
		).rejects.toThrow(ReviewNotAvailableError);
	});

	it("refuses another owner's game", async () => {
		const { deps, stage } = await inResults();

		await expect(
			createOpenAnswerReview(deps)({
				ownerId: "user-2",
				gameId: "game-1",
				from: await stage(),
			}),
		).rejects.toThrow(GameNotFoundError);
	});
});

describe("getTypedAnswers (spec 031, RN-27, RN-28)", () => {
	it("lists accepted, similar and other answers with counts", async () => {
		const { deps } = await inResults();

		const view = await createGetTypedAnswers(deps)({
			...mine,
			questionIndex: 0,
		});

		expect(view.groups).toEqual([
			{
				key: "pedro",
				text: "Pedro",
				count: 1,
				correct: true,
				accepted: true,
				similar: false,
			},
			{
				key: "simao pedro",
				text: "Simão Pedro",
				count: 0,
				correct: true,
				accepted: true,
				similar: false,
			},
			{
				key: "pedra",
				text: "Pedra",
				count: 2,
				correct: false,
				accepted: false,
				similar: true,
			},
			{
				key: "paulo",
				text: "Paulo",
				count: 1,
				correct: false,
				accepted: false,
				similar: false,
			},
		]);
	});

	it("refuses a question that is not in its results", async () => {
		const { deps } = await inResults();

		await expect(
			createGetTypedAnswers(deps)({ ...mine, questionIndex: 1 }),
		).rejects.toThrow(ReviewNotAvailableError);
	});
});
