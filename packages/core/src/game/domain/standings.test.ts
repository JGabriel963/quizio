import { describe, expect, it } from "vitest";

import { anAnswer } from "../testing/a-game-question";
import {
	rankPlayers,
	SCOREBOARD_SIZE,
	scoreboardOf,
	standingOf,
	streakAfter,
} from "./standings";

/** Players in order of arrival. */
const players = ["Ana", "Bia", "Caio", "Duda", "Eva", "Fábio", "Gil"].map(
	(nickname, index) => ({ id: `p${index + 1}`, nickname }),
);
const totals = (...values: number[]) =>
	values.map((total, index) => ({ playerId: `p${index + 1}`, total }));

describe("rankPlayers (spec 010)", () => {
	it("ranks by total, the highest first", () => {
		const standings = rankPlayers(players.slice(0, 3), totals(700, 1750, 875));

		expect(standings).toEqual([
			{ playerId: "p2", nickname: "Bia", total: 1750, rank: 1 },
			{ playerId: "p3", nickname: "Caio", total: 875, rank: 2 },
			{ playerId: "p1", nickname: "Ana", total: 700, rank: 3 },
		]);
	});

	it("ties stay in order of arrival, each with its own place", () => {
		const standings = rankPlayers(players.slice(0, 3), totals(500, 900, 500));

		expect(standings.map(({ nickname, rank }) => [nickname, rank])).toEqual([
			["Bia", 1],
			["Ana", 2],
			["Caio", 3],
		]);
	});

	it("gives zero to who has no answer, and ignores who is not in the game", () => {
		const standings = rankPlayers(players.slice(0, 2), [
			{ playerId: "p2", total: 639 },
			{ playerId: "removed", total: 2000 },
		]);

		expect(standings).toEqual([
			{ playerId: "p2", nickname: "Bia", total: 639, rank: 1 },
			{ playerId: "p1", nickname: "Ana", total: 0, rank: 2 },
		]);
	});
});

describe("scoreboardOf (spec 010)", () => {
	it("shows the first five", () => {
		const current = rankPlayers(
			players,
			totals(100, 700, 300, 600, 200, 500, 400),
		);

		const board = scoreboardOf(current, null);

		expect(board).toHaveLength(SCOREBOARD_SIZE);
		expect(board.map((entry) => entry.nickname)).toEqual([
			"Bia",
			"Duda",
			"Fábio",
			"Gil",
			"Caio",
		]);
	});

	it("shows everybody when there are fewer than five", () => {
		const board = scoreboardOf(
			rankPlayers(players.slice(0, 2), totals(639, 0)),
			null,
		);

		expect(board.map(({ nickname, total }) => [nickname, total])).toEqual([
			["Ana", 639],
			["Bia", 0],
		]);
	});

	it("marks who climbed since the previous scoreboard, not who went down", () => {
		const two = players.slice(0, 2);
		const previous = rankPlayers(two, totals(639, 0));
		const current = rankPlayers(two, totals(639, 701));

		expect(scoreboardOf(current, previous)).toEqual([
			{ playerId: "p2", nickname: "Bia", total: 701, rank: 1, climbed: true },
			{ playerId: "p1", nickname: "Ana", total: 639, rank: 2, climbed: false },
		]);
	});

	it("the first scoreboard has no arrows", () => {
		const board = scoreboardOf(
			rankPlayers(players.slice(0, 3), totals(0, 900, 500)),
			null,
		);

		expect(board.every((entry) => !entry.climbed)).toBe(true);
	});

	it("has no arrows when nothing changed", () => {
		const standings = rankPlayers(players.slice(0, 3), totals(900, 500, 0));

		expect(
			scoreboardOf(standings, standings).every((entry) => !entry.climbed),
		).toBe(true);
	});
});

describe("streakAfter (spec 010, RN-10)", () => {
	const answered = (
		questionIndex: number,
		correctness: "correct" | "partiallyCorrect" | "wrong",
	) => anAnswer({ questionIndex, correctness });

	it("counts the questions in a row answered right", () => {
		const answers = [
			answered(0, "correct"),
			answered(1, "correct"),
			answered(2, "correct"),
			answered(3, "wrong"),
			answered(4, "correct"),
		];

		expect(streakAfter(answers, 2)).toBe(3);
		expect(streakAfter(answers, 3)).toBe(0);
		expect(streakAfter(answers, 4)).toBe(1);
	});

	it("a question without an answer breaks the streak", () => {
		const answers = [answered(0, "correct"), answered(1, "correct")];

		expect(streakAfter(answers, 1)).toBe(2);
		expect(streakAfter(answers, 2)).toBe(0);
		expect(streakAfter([...answers, answered(3, "correct")], 3)).toBe(1);
	});

	it("a partially correct answer keeps the streak", () => {
		expect(
			streakAfter([answered(0, "correct"), answered(1, "partiallyCorrect")], 1),
		).toBe(2);
	});

	it("is zero before any question", () => {
		expect(streakAfter([], -1)).toBe(0);
	});
});

describe("standingOf (spec 010, RN-15)", () => {
	const standings = rankPlayers(
		players.slice(0, 5),
		totals(2000, 1900, 1800, 1620, 1500),
	);

	it("tells the place and who is right ahead", () => {
		expect(standingOf(standings, "p5")).toEqual({
			rank: 5,
			total: 1500,
			behind: { nickname: "Duda", points: 120 },
		});
	});

	it("has nobody ahead of the first", () => {
		expect(standingOf(standings, "p1")).toEqual({
			rank: 1,
			total: 2000,
			behind: null,
		});
	});

	it("is null for who is not in the game", () => {
		expect(standingOf(standings, "p9")).toBeNull();
	});
});
