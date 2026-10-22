import { describe, expect, it } from "vitest";

import { anAnswer } from "./a-game-question";
import { InMemoryAnswerRepository } from "./in-memory-answer-repository";

describe("InMemoryAnswerRepository (spec 031)", () => {
	const reviewedAt = new Date("2026-06-01T12:01:00.000Z");

	async function withAnswers() {
		const answers = new InMemoryAnswerRepository();
		await answers.add(
			anAnswer({
				playerId: "p1",
				text: "pedra",
				correctness: "wrong",
				points: 0,
			}),
		);
		await answers.add(
			anAnswer({ playerId: "p2", text: "Pedro", correctness: "correct" }),
		);
		await answers.add(
			anAnswer({
				questionIndex: 1,
				playerId: "p1",
				correctness: "wrong",
				points: 0,
			}),
		);
		return answers;
	}

	it("regrade rewrites correctness and points of the given answers and marks them reviewed", async () => {
		const answers = await withAnswers();

		await answers.regrade(
			"game-1",
			0,
			[{ playerId: "p1", correctness: "correct", points: 640 }],
			reviewedAt,
		);

		expect(await answers.find("game-1", 0, "p1")).toMatchObject({
			text: "pedra",
			correctness: "correct",
			points: 640,
			reviewedAt,
		});
	});

	it("regrade leaves the other answers alone", async () => {
		const answers = await withAnswers();

		await answers.regrade(
			"game-1",
			0,
			[{ playerId: "p1", correctness: "correct", points: 640 }],
			reviewedAt,
		);

		expect(await answers.find("game-1", 0, "p2")).toMatchObject({
			correctness: "correct",
			reviewedAt: null,
		});
		expect(await answers.find("game-1", 1, "p1")).toMatchObject({
			correctness: "wrong",
			points: 0,
			reviewedAt: null,
		});
	});
});
