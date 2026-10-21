import { describe, expect, it } from "vitest";

import { aGame, aPlayer, aPlayingGame } from "../testing/a-game";
import { aGameQuestion } from "../testing/a-game-question";
import { DEFAULT_ASSIGNMENT_OPTIONS, newAssignment } from "./assignment";
import { endGame } from "./game";
import {
	AvatarFixedError,
	avatarShown,
	canAnswer,
	canChangeAvatar,
	changePlayerAvatar,
	firstQuestionFor,
	newAssignmentParticipant,
	newPlayer,
	removePlayer,
} from "./player";

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
				avatar: { character: "koala", accessory: null },
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

describe("the player's avatar (spec 028)", () => {
	const tiger = { character: "tiger", accessory: "crown" } as const;
	const now = new Date("2026-06-01T12:02:00.000Z");

	it("a new player keeps the avatar given", () => {
		const player = newPlayer({
			id: "player-1",
			gameId: "game-1",
			nickname: "Caio",
			secret: "s",
			firstQuestionIndex: 0,
			avatar: tiger,
			now,
		});

		expect(player.avatar).toEqual(tiger);
	});

	it("changes the avatar in the lobby", () => {
		const changed = changePlayerAvatar(aGame(), aPlayer(), tiger);

		expect(changed.avatar).toEqual(tiger);
		expect(canChangeAvatar(aGame(), aPlayer())).toBe(true);
	});

	it("refuses a change once the game intro started", () => {
		for (const game of [
			aPlayingGame("gameIntro"),
			aPlayingGame("answering", { questionIndex: 1 }),
		]) {
			expect(canChangeAvatar(game, aPlayer())).toBe(false);
			expect(() => changePlayerAvatar(game, aPlayer(), tiger)).toThrow(
				AvatarFixedError,
			);
		}
	});

	it("a player who joined during the answers changes until the next question opens", () => {
		const late = aPlayer({ firstQuestionIndex: 2 });

		for (const phase of ["answering", "results", "scoreboard"] as const) {
			expect(
				canChangeAvatar(aPlayingGame(phase, { questionIndex: 1 }), late),
			).toBe(true);
		}
		expect(
			canChangeAvatar(
				aPlayingGame("questionIntro", { questionIndex: 2 }),
				late,
			),
		).toBe(false);
	});

	it("refuses a change with characters off", () => {
		const game = aGame({
			options: { ...aGame().options, gameCharacters: false },
		});

		expect(canChangeAvatar(game, aPlayer())).toBe(false);
		expect(() => changePlayerAvatar(game, aPlayer(), tiger)).toThrow(
			AvatarFixedError,
		);
	});

	it("refuses a change from a removed player or in a game that is over", () => {
		expect(canChangeAvatar(aGame(), removePlayer(aPlayer(), now))).toBe(false);
		expect(canChangeAvatar(endGame(aGame(), "host", now), aPlayer())).toBe(
			false,
		);
	});

	it("avatarShown is null with characters off", () => {
		const player = aPlayer({ avatar: tiger });

		expect(avatarShown(aGame(), player)).toEqual(tiger);
		expect(
			avatarShown(
				aGame({ options: { ...aGame().options, gameCharacters: false } }),
				player,
			),
		).toBeNull();
	});
});

describe("assignment participant (spec 030)", () => {
	const now = new Date("2026-10-19T14:00:00.000Z");
	const assignment = (options = {}) =>
		newAssignment({
			id: "game-1",
			ownerId: "user-1",
			quizId: "quiz-1",
			quizVersion: 1,
			title: "Capitais",
			pin: "04352236",
			deadline: new Date("2026-10-22T15:00:00.000Z"),
			options: { ...DEFAULT_ASSIGNMENT_OPTIONS, ...options },
			questionCount: 2,
			now,
		});
	const questions = [
		aGameQuestion({ index: 0 }),
		aGameQuestion({
			index: 1,
			type: "trueFalse",
			choices: [
				{ id: "true", shapeIndex: 1, text: "Verdadeiro", correct: true },
				{ id: "false", shapeIndex: 0, text: "Falso", correct: false },
			],
		}),
	];
	const join = (game = assignment()) =>
		newAssignmentParticipant({
			id: "player-1",
			game,
			questions,
			nickname: "John",
			secret: "secret-1",
			avatar: { character: "koala", accessory: null },
			shuffle: (items) => [...items].reverse(),
			now,
		});

	it("an assignment participant starts at the first question, with progress", () => {
		expect(join()).toMatchObject({
			gameId: "game-1",
			nickname: "John",
			firstQuestionIndex: 0,
			progress: { questionIndex: 0, phase: "answering", startedAt: now },
			choiceOrder: null,
		});
	});

	it("with random answers each Quiz question gets a drawn order", () => {
		const player = join(assignment({ randomizeAnswers: true }));

		expect(player.choiceOrder?.[0]).toEqual(
			[...(questions[0]?.choices ?? [])].reverse().map(({ id }) => id),
		);
	});

	it("true/false is never shuffled", () => {
		const player = join(assignment({ randomizeAnswers: true }));

		expect(player.choiceOrder?.[1]).toEqual(["true", "false"]);
	});

	it("without random answers there is no order of its own", () => {
		expect(join().choiceOrder).toBeNull();
	});

	it("a live player has no progress", () => {
		const player = newPlayer({
			id: "player-1",
			gameId: "game-1",
			nickname: "Ana",
			secret: "s",
			firstQuestionIndex: 0,
			avatar: { character: "koala", accessory: null },
			now,
		});

		expect(player.progress).toBeNull();
		expect(player.choiceOrder).toBeNull();
	});
});
