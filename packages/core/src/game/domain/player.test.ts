import { describe, expect, it } from "vitest";

import { aGame, aPlayer, aPlayingGame } from "../testing/a-game";
import { canAnswer, firstQuestionFor, newPlayer } from "./player";

describe("joining a game in progress (spec 012)", () => {
	it("who joins in the lobby starts at the first question", () => {
		expect(firstQuestionFor(aGame())).toBe(0);
		expect(
			newPlayer({
				id: "player-1",
				gameId: "game-1",
				nickname: "Caio",
				secret: "s",
				firstQuestionIndex: firstQuestionFor(aGame()),
				now: new Date("2026-06-01T12:00:00.000Z"),
			}).firstQuestionIndex,
		).toBe(0);
	});

	it("who joins before the answers open plays that question", () => {
		expect(firstQuestionFor(aPlayingGame("gameIntro"))).toBe(0);
		expect(
			firstQuestionFor(aPlayingGame("questionIntro", { questionIndex: 1 })),
		).toBe(1);
	});

	it("who joins from the answers on starts at the next question", () => {
		for (const phase of ["answering", "results", "scoreboard"] as const) {
			expect(firstQuestionFor(aPlayingGame(phase, { questionIndex: 1 }))).toBe(
				2,
			);
		}
	});

	it("who joins at the last answers has no question to play", () => {
		const game = aPlayingGame("answering", {
			questionIndex: 2,
			questionCount: 3,
		});

		expect(firstQuestionFor(game)).toBe(3);
	});

	it("may answer from the first question on", () => {
		const player = aPlayer({ firstQuestionIndex: 2 });

		expect(canAnswer(player, 1)).toBe(false);
		expect(canAnswer(player, 2)).toBe(true);
		expect(canAnswer(player, 3)).toBe(true);
		expect(canAnswer(aPlayer(), 0)).toBe(true);
	});
});
