import { describe, expect, it } from "vitest";

import type { HostGameData } from "./api-types";
import { applyLobbyEvent } from "./game-lobby";

const koala = { character: "koala", accessory: null } as const;
const fox = { character: "fox", accessory: "crown" } as const;

const lobby: HostGameData = {
	gameId: "game-1",
	quizId: "quiz-1",
	title: "Capitais",
	pin: "265914",
	status: "lobby",
	endReason: null,
	locked: false,
	options: {
		showQuestionsOnDevices: false,
		randomizeQuestions: false,
		randomizeAnswers: false,
		autoplay: false,
		gameCharacters: true,
	},
	players: [{ id: "p1", nickname: "Ana", avatar: koala }],
	questionCount: 0,
	autoStart: null,
	stage: null,
	final: null,
};

describe("applyLobbyEvent (spec 008)", () => {
	it("adds a player at the end, once", () => {
		const joined = applyLobbyEvent(lobby, {
			type: "playerJoined",
			player: { id: "p2", nickname: "Bia", avatar: fox },
		});

		expect(joined.players).toEqual([
			{ id: "p1", nickname: "Ana", avatar: koala },
			{ id: "p2", nickname: "Bia", avatar: fox },
		]);
		expect(
			applyLobbyEvent(joined, {
				type: "playerJoined",
				player: { id: "p2", nickname: "Bia", avatar: fox },
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

describe("applyLobbyEvent: options (spec 012)", () => {
	it("applies only the option the host changed", () => {
		const changed = applyLobbyEvent(lobby, {
			type: "optionsChanged",
			options: { showQuestionsOnDevices: true },
		});

		expect(changed.options).toEqual({
			showQuestionsOnDevices: true,
			randomizeQuestions: false,
			randomizeAnswers: false,
			autoplay: false,
			gameCharacters: true,
		});
		expect(changed.locked).toBe(false);
		expect(lobby.options.showQuestionsOnDevices).toBe(false);
	});
});

describe("applyLobbyEvent: autoplay (spec 014)", () => {
	const counting: HostGameData = {
		...lobby,
		options: { ...lobby.options, autoplay: true },
		autoStart: { remainingMs: 9_000, token: "t1" },
	};
	const results: HostGameData = {
		...lobby,
		status: "playing",
		options: { ...lobby.options, autoplay: true },
		stage: {
			questionIndex: 0,
			phase: "results",
			remainingMs: null,
			durationMs: null,
			question: null,
			answerCount: 1,
			distribution: null,
			scoreboard: null,
			scoreboardLeavers: null,
			typedAnswers: null,
			reviewOpen: false,
			sliderResults: null,
			autoAdvance: { remainingMs: 3_000, token: "a1" },
		},
	};

	it("turning autoplay off takes the countdowns away at once", () => {
		const off = {
			type: "optionsChanged",
			options: { autoplay: false },
		} as const;

		expect(applyLobbyEvent(counting, off)).toMatchObject({
			options: { autoplay: false },
			autoStart: null,
		});
		expect(applyLobbyEvent(results, off)).toMatchObject({
			options: { autoplay: false },
			stage: { phase: "results", autoAdvance: null, answerCount: 1 },
		});
	});

	it("turning it on waits for the server's countdown", () => {
		const view = applyLobbyEvent(lobby, {
			type: "optionsChanged",
			options: { autoplay: true },
		});

		expect(view.options.autoplay).toBe(true);
		expect(view.autoStart).toBeNull();
	});

	it("another option leaves the countdowns alone", () => {
		const change = {
			type: "optionsChanged",
			options: { showQuestionsOnDevices: true },
		} as const;

		expect(applyLobbyEvent(counting, change).autoStart).toEqual(
			counting.autoStart,
		);
		expect(applyLobbyEvent(results, change).stage?.autoAdvance).toEqual(
			results.stage?.autoAdvance,
		);
	});
});

describe("applyLobbyEvent: avatars (spec 028)", () => {
	it("avatarChanged replaces the avatar of that player", () => {
		const changed = applyLobbyEvent(lobby, {
			type: "avatarChanged",
			playerId: "p1",
			avatar: fox,
		});

		expect(changed.players).toEqual([
			{ id: "p1", nickname: "Ana", avatar: fox },
		]);
	});

	it("avatarChanged leaves the avatars hidden with the characters off", () => {
		const off: HostGameData = {
			...lobby,
			options: { ...lobby.options, gameCharacters: false },
			players: [{ id: "p1", nickname: "Ana", avatar: null }],
		};

		expect(
			applyLobbyEvent(off, {
				type: "avatarChanged",
				playerId: "p1",
				avatar: fox,
			}),
		).toBe(off);
	});

	it("playerJoined keeps the avatar", () => {
		expect(
			applyLobbyEvent(lobby, {
				type: "playerJoined",
				player: { id: "p2", nickname: "Bia", avatar: fox },
			}).players.at(-1),
		).toEqual({ id: "p2", nickname: "Bia", avatar: fox });
	});
});
