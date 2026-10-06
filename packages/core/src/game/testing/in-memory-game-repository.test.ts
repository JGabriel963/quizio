import { describe, expect, it } from "vitest";

import { aGame, aPlayingGame } from "./a-game";
import { InMemoryGameRepository } from "./in-memory-game-repository";

describe("InMemoryGameRepository", () => {
	it("deletes the games of a quiz that never started and keeps the started ones (spec 015)", async () => {
		const games = new InMemoryGameRepository();
		await games.save(aGame({ id: "lobby", pin: "111111" }));
		await games.save(
			aGame({
				id: "ended-in-lobby",
				pin: "222222",
				status: "ended",
				endedAt: new Date("2026-06-01T12:05:00.000Z"),
				endReason: "host",
			}),
		);
		await games.save(
			aPlayingGame("results", {}, { id: "playing", pin: "333333" }),
		);
		await games.save(
			aGame({
				id: "finished",
				pin: "444444",
				status: "finished",
				questionCount: 3,
				endedAt: new Date("2026-06-01T12:30:00.000Z"),
			}),
		);
		await games.save(
			aGame({ id: "other-quiz", pin: "555555", quizId: "quiz-2" }),
		);

		await games.deleteUnstartedByQuiz("quiz-1");

		expect(games.all().map(({ id }) => id)).toEqual([
			"playing",
			"finished",
			"other-quiz",
		]);
	});
});
