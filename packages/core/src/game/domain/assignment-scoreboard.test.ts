import { describe, expect, it } from "vitest";

import { assignmentScoreboard } from "./assignment-scoreboard";
import { rankPlayers } from "./standings";

const players = [
	"Ana",
	"Bia",
	"Caio",
	"Davi",
	"Eva",
	"Fábio",
	"Gil",
	"John",
].map((nickname) => ({ id: nickname, nickname, avatar: null }));

describe("assignment scoreboard (spec 030, RN-14, RN-15)", () => {
	it("a lone participant sees only themselves", () => {
		const standings = rankPlayers(players.slice(0, 1), [
			{ playerId: "Ana", total: 932 },
		]);

		expect(assignmentScoreboard(standings, standings, "Ana")).toEqual({
			top: [
				{
					playerId: "Ana",
					nickname: "Ana",
					avatar: null,
					total: 932,
					rank: 1,
					climbed: false,
					previous: { rank: 1, total: 932 },
				},
			],
			viewer: null,
		});
	});

	it("everyone is ranked by their current total, ties by arrival", () => {
		const standings = rankPlayers(players.slice(0, 3), [
			{ playerId: "Ana", total: 500 },
			{ playerId: "Bia", total: 3710 },
			{ playerId: "Caio", total: 500 },
		]);

		expect(
			assignmentScoreboard(standings, standings, "Caio").top.map(
				({ nickname, rank }) => `${rank} ${nickname}`,
			),
		).toEqual(["1 Bia", "2 Ana", "3 Caio"]);
	});

	it("shows the first five and the viewer's own row when outside them", () => {
		const standings = rankPlayers(
			players,
			players.map((player, index) => ({
				playerId: player.id,
				total: 1000 - index * 100,
			})),
		);

		const board = assignmentScoreboard(standings, standings, "John");

		expect(board.top.map(({ nickname }) => nickname)).toEqual([
			"Ana",
			"Bia",
			"Caio",
			"Davi",
			"Eva",
		]);
		expect(board.viewer).toMatchObject({ nickname: "John", rank: 8 });
	});

	it("the viewer's row is not repeated when inside the five", () => {
		const standings = rankPlayers(players, []);

		expect(assignmentScoreboard(standings, standings, "Bia").viewer).toBeNull();
	});

	it("who climbed since the viewer's last answer gets the arrow", () => {
		const two = players.slice(0, 2);
		const previous = rankPlayers(two, [
			{ playerId: "Ana", total: 822 },
			{ playerId: "Bia", total: 0 },
		]);
		const current = rankPlayers(two, [
			{ playerId: "Ana", total: 822 },
			{ playerId: "Bia", total: 927 },
		]);

		const { top } = assignmentScoreboard(current, previous, "Bia");

		expect(top[0]).toMatchObject({
			nickname: "Bia",
			climbed: true,
			previous: { rank: 2, total: 0 },
		});
		expect(top[1]).toMatchObject({ nickname: "Ana", climbed: false });
	});
});
