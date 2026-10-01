import { describe, expect, it } from "vitest";

import type { HostGameData } from "./api-types";
import { applyLobbyEvent } from "./game-lobby";

const lobby: HostGameData = {
	gameId: "game-1",
	quizId: "quiz-1",
	title: "Capitais",
	pin: "265914",
	status: "lobby",
	endReason: null,
	locked: false,
	players: [{ id: "p1", nickname: "Ana" }],
	questionCount: 0,
	stage: null,
};

describe("applyLobbyEvent (spec 008)", () => {
	it("adds a player at the end, once", () => {
		const joined = applyLobbyEvent(lobby, {
			type: "playerJoined",
			player: { id: "p2", nickname: "Bia" },
		});

		expect(joined.players).toEqual([
			{ id: "p1", nickname: "Ana" },
			{ id: "p2", nickname: "Bia" },
		]);
		expect(
			applyLobbyEvent(joined, {
				type: "playerJoined",
				player: { id: "p2", nickname: "Bia" },
			}),
		).toBe(joined);
	});

	it("removes a player, and an unknown one changes nothing", () => {
		expect(
			applyLobbyEvent(lobby, { type: "playerRemoved", playerId: "p1" }).players,
		).toEqual([]);
		expect(
			applyLobbyEvent(lobby, { type: "playerRemoved", playerId: "gone" })
				.players,
		).toEqual(lobby.players);
	});

	it("follows the padlock", () => {
		expect(
			applyLobbyEvent(lobby, { type: "lockChanged", locked: true }).locked,
		).toBe(true);
	});

	it("ends the game, keeping the first reason", () => {
		const ended = applyLobbyEvent(lobby, { type: "gameEnded", reason: "host" });

		expect(ended).toMatchObject({ status: "ended", endReason: "host" });
		expect(
			applyLobbyEvent(ended, { type: "gameEnded", reason: "expired" }),
		).toBe(ended);
	});
});
