import { GAME_EVENTS, gameChannel } from "@quizio/core/game/domain/game-events";
import { PIN_ATTEMPT_LIMIT } from "@quizio/core/game/domain/game-pin";
import { somePlayableQuestions } from "@quizio/core/game/testing/game-deps";
import { newQuizVersion } from "@quizio/core/quiz/domain/quiz-version";
import { aPublishedQuiz, aQuiz } from "@quizio/core/quiz/testing/a-quiz";
import { describe, expect, it } from "vitest";

import { createTestApi } from "../testing/test-context";

const trashedAt = new Date("2026-05-01T00:00:00.000Z");

async function published() {
	const api = createTestApi();
	await api.quizzes.save(aPublishedQuiz({ title: "Capitais" }));
	await api.versions.save(
		newQuizVersion({
			quizId: "quiz-1",
			number: 1,
			questions: somePlayableQuestions(),
			now: new Date("2026-02-01T10:00:00.000Z"),
		}),
	);
	return api;
}

async function hosted() {
	const api = await published();
	const host = api.callerFor("user-1");
	const { gameId } = await host.game.host({ quizId: "quiz-1" });
	const { pin } = await host.game.view({ gameId });
	return { api, host, gameId, pin };
}

describe("game router: the host (spec 008)", () => {
	it("hosts a published quiz and shows its lobby", async () => {
		const { host, gameId, pin } = await hosted();

		expect(pin).toMatch(/^[1-9]\d{5}$/);
		expect(await host.game.view({ gameId })).toEqual({
			gameId,
			quizId: "quiz-1",
			title: "Capitais",
			pin,
			status: "lobby",
			endReason: null,
			locked: false,
			players: [],
			questionCount: 0,
			stage: null,
		});
	});

	it("requires a session to host and to open the lobby", async () => {
		const { api, gameId } = await hosted();
		const visitor = api.callerFor(null);

		await expect(visitor.game.host({ quizId: "quiz-1" })).rejects.toMatchObject(
			{ code: "UNAUTHORIZED" },
		);
		await expect(visitor.game.view({ gameId })).rejects.toMatchObject({
			code: "UNAUTHORIZED",
		});
	});

	it("refuses a draft and a quiz in the trash", async () => {
		const api = createTestApi();
		await api.quizzes.save(aQuiz({ id: "draft" }));
		await api.quizzes.save(aPublishedQuiz({ id: "trashed", trashedAt }));
		const host = api.callerFor("user-1");

		for (const quizId of ["draft", "trashed"]) {
			await expect(host.game.host({ quizId })).rejects.toMatchObject({
				code: "BAD_REQUEST",
				cause: { code: "GAME.QUIZ_NOT_PLAYABLE" },
			});
		}
	});

	it("another creator's quiz and game are not found", async () => {
		const { api, gameId } = await hosted();
		const other = api.callerFor("user-2");

		await expect(other.game.host({ quizId: "quiz-1" })).rejects.toMatchObject({
			code: "NOT_FOUND",
			cause: { code: "GAME.QUIZ_NOT_FOUND" },
		});
		for (const call of [
			other.game.view({ gameId }),
			other.game.setLocked({ gameId, locked: true }),
			other.game.end({ gameId }),
			other.game.removePlayer({ gameId, playerId: "any" }),
		]) {
			await expect(call).rejects.toMatchObject({
				code: "NOT_FOUND",
				cause: { code: "GAME.NOT_FOUND" },
			});
		}
	});

	it("locks, removes and ends, publishing each change", async () => {
		const { api, host, gameId } = await hosted();
		const player = await api
			.callerFor(null)
			.game.join.enter({ gameId, nickname: "ACT" });

		await host.game.setLocked({ gameId, locked: true });
		await host.game.removePlayer({ gameId, playerId: player.playerId });
		await host.game.end({ gameId });

		expect(await host.game.view({ gameId })).toMatchObject({
			status: "ended",
			endReason: "host",
			locked: true,
			players: [],
		});
		expect(
			api.realtime.messagesOn(gameChannel(gameId)).map(({ event }) => event),
		).toEqual([
			GAME_EVENTS.playerJoined,
			GAME_EVENTS.lockChanged,
			GAME_EVENTS.playerRemoved,
			GAME_EVENTS.gameEnded,
		]);
	});

	it("deleting the quiz for good ends its open game", async () => {
		const { api, host, gameId } = await hosted();
		await api.quizzes.save(aPublishedQuiz({ title: "Capitais", trashedAt }));

		await host.quiz.deletePermanently({ quizId: "quiz-1" });

		expect(await api.games.findById(gameId)).toMatchObject({
			status: "ended",
			endReason: "quizDeleted",
		});
	});
});

describe("game router: the player (spec 008)", () => {
	it("joins without an account and waits", async () => {
		const { api, host, gameId, pin } = await hosted();
		const visitor = api.callerFor(null);

		const found = await visitor.game.join.find({ pin });
		const player = await visitor.game.join.enter({
			gameId: found.gameId,
			nickname: "ACT",
		});

		expect(found).toEqual({ gameId, pin });
		expect(
			await visitor.game.join.session({
				gameId,
				playerId: player.playerId,
				secret: player.secret,
			}),
		).toEqual({ gameId, nickname: "ACT", status: "waiting", stage: null });
		expect((await host.game.view({ gameId })).players).toEqual([
			{ id: player.playerId, nickname: "ACT" },
		]);
	});

	it("maps the join errors to their domain codes", async () => {
		const { api, host, gameId, pin } = await hosted();
		const visitor = api.callerFor(null);
		await visitor.game.join.enter({ gameId, nickname: "ACT" });

		await expect(
			visitor.game.join.find({ pin: "111111" }),
		).rejects.toMatchObject({
			code: "BAD_REQUEST",
			cause: { code: "GAME.PIN_NOT_RECOGNIZED" },
		});
		await expect(
			visitor.game.join.enter({ gameId, nickname: "act" }),
		).rejects.toMatchObject({ cause: { code: "GAME.NICKNAME_TAKEN" } });
		await expect(
			visitor.game.join.enter({ gameId, nickname: "   " }),
		).rejects.toMatchObject({ cause: { code: "GAME.INVALID_NICKNAME" } });
		await expect(
			visitor.game.join.session({ gameId, playerId: "id-9", secret: "guess" }),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
			cause: { code: "GAME.NOT_FOUND" },
		});

		await host.game.setLocked({ gameId, locked: true });
		await expect(visitor.game.join.find({ pin })).rejects.toMatchObject({
			cause: { code: "GAME.LOCKED" },
		});
		await expect(
			visitor.game.join.enter({ gameId, nickname: "Bia" }),
		).rejects.toMatchObject({ cause: { code: "GAME.LOCKED" } });
	});

	it("limits wrong PINs per network address", async () => {
		const { api, pin } = await hosted();
		const sameNetwork = api.callerFor(null, "198.51.100.7");
		for (let attempt = 0; attempt < PIN_ATTEMPT_LIMIT; attempt++) {
			await sameNetwork.game.join.find({ pin: "111111" }).catch(() => {});
		}

		await expect(sameNetwork.game.join.find({ pin })).rejects.toMatchObject({
			code: "BAD_REQUEST",
			cause: { code: "GAME.TOO_MANY_PIN_ATTEMPTS" },
		});
		await expect(
			api.callerFor(null, "198.51.100.8").game.join.find({ pin }),
		).resolves.toMatchObject({ pin });
	});

	it("rejects oversized input before any use case runs", async () => {
		const { api, gameId } = await hosted();
		const visitor = api.callerFor(null);

		await expect(
			visitor.game.join.find({ pin: "1".repeat(17) }),
		).rejects.toMatchObject({
			code: "BAD_REQUEST",
			cause: { name: "ZodError" },
		});
		await expect(
			visitor.game.join.enter({ gameId, nickname: "a".repeat(101) }),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});
});

/** A hosted game with two players in, ready to start. */
async function withPlayers() {
	const { api, host, gameId, pin } = await hosted();
	const visitor = api.callerFor(null);
	const join = async (nickname: string) => {
		const { playerId, secret } = await visitor.game.join.enter({
			gameId,
			nickname,
		});
		return { gameId, playerId, secret };
	};
	return {
		api,
		host,
		visitor,
		gameId,
		pin,
		ana: await join("Ana"),
		bia: await join("Bia"),
	};
}

/** Started and taken to the answers of the first question. */
async function answering() {
	const game = await withPlayers();
	const { api, host, gameId } = game;
	await host.game.start({ gameId });
	api.clock.advanceBy(3_000);
	await host.game.advance({
		gameId,
		from: { questionIndex: 0, phase: "gameIntro" },
	});
	api.clock.advanceBy(5_000);
	await host.game.advance({
		gameId,
		from: { questionIndex: 0, phase: "questionIntro" },
	});
	return game;
}

describe("game router: playing (spec 009)", () => {
	it("starts, advances and reveals", async () => {
		const { api, host, visitor, gameId, ana, bia } = await answering();

		expect((await host.game.view({ gameId })).stage).toMatchObject({
			questionIndex: 0,
			phase: "answering",
			remainingMs: 20_000,
			answerCount: 0,
		});

		api.clock.advanceBy(4_200);
		await visitor.game.join.answer({
			...ana,
			questionIndex: 0,
			choiceIds: ["choice-1"],
		});
		await visitor.game.join.answer({
			...bia,
			questionIndex: 0,
			choiceIds: ["choice-2"],
		});

		// Everybody answered: the results come without the host asking.
		const view = await host.game.view({ gameId });
		expect(view.stage).toMatchObject({
			phase: "results",
			answerCount: 2,
			distribution: [
				{ choiceId: "choice-1", count: 1 },
				{ choiceId: "choice-2", count: 1 },
				{ choiceId: "choice-3", count: 0 },
				{ choiceId: "choice-4", count: 0 },
			],
		});
		expect((await visitor.game.join.session(ana)).stage?.result).toBe(
			"correct",
		);
		expect((await visitor.game.join.session(bia)).stage?.result).toBe("wrong");
		expect(await api.answers.find(gameId, 0, ana.playerId)).toMatchObject({
			responseTimeMs: 4_200,
		});
	});

	it("requires a session to start and to advance, and the game's owner", async () => {
		const { api, visitor, gameId } = await withPlayers();
		const from = { questionIndex: 0, phase: "gameIntro" } as const;

		await expect(visitor.game.start({ gameId })).rejects.toMatchObject({
			code: "UNAUTHORIZED",
		});
		await expect(visitor.game.advance({ gameId, from })).rejects.toMatchObject({
			code: "UNAUTHORIZED",
		});
		const other = api.callerFor("user-2");
		for (const call of [
			other.game.start({ gameId }),
			other.game.advance({ gameId, from }),
		]) {
			await expect(call).rejects.toMatchObject({
				code: "NOT_FOUND",
				cause: { code: "GAME.NOT_FOUND" },
			});
		}
		expect(await api.games.findById(gameId)).toMatchObject({ status: "lobby" });
	});

	it("maps the play errors to their domain codes", async () => {
		const empty = await hosted();
		await expect(
			empty.host.game.start({ gameId: empty.gameId }),
		).rejects.toMatchObject({
			code: "BAD_REQUEST",
			cause: { code: "GAME.NO_PLAYERS" },
		});

		const { host, visitor, gameId, pin, ana } = await answering();
		await expect(
			host.game.advance({
				gameId,
				from: { questionIndex: 0, phase: "answering" },
			}),
		).rejects.toMatchObject({ cause: { code: "GAME.STAGE_NOT_DUE" } });
		await expect(visitor.game.join.find({ pin })).rejects.toMatchObject({
			cause: { code: "GAME.ALREADY_STARTED" },
		});
		await expect(
			visitor.game.join.enter({ gameId, nickname: "Caio" }),
		).rejects.toMatchObject({ cause: { code: "GAME.ALREADY_STARTED" } });

		const answer = { ...ana, questionIndex: 0, choiceIds: ["choice-1"] };
		await expect(
			visitor.game.join.answer({ ...answer, secret: "guess" }),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
			cause: { code: "GAME.NOT_FOUND" },
		});
		await expect(
			visitor.game.join.answer({ ...answer, choiceIds: ["choice-9"] }),
		).rejects.toMatchObject({ cause: { code: "GAME.INVALID_ANSWER" } });
		await visitor.game.join.answer(answer);
		await expect(visitor.game.join.answer(answer)).rejects.toMatchObject({
			cause: { code: "GAME.ALREADY_ANSWERED" },
		});
		await expect(
			visitor.game.join.answer({ ...answer, questionIndex: 1 }),
		).rejects.toMatchObject({ cause: { code: "GAME.ANSWERS_CLOSED" } });
	});

	it("never sends a player the right answer, the texts or the count per answer", async () => {
		const { api, visitor, gameId, ana, bia } = await answering();
		await visitor.game.join.answer({
			...bia,
			questionIndex: 0,
			choiceIds: ["choice-1"],
		});

		const session = await visitor.game.join.session(ana);
		const published = api.realtime.messagesOn(gameChannel(gameId));

		for (const sent of [session, published]) {
			expect(JSON.stringify(sent)).not.toMatch(
				/Brasília|capital|correct|distribution/i,
			);
		}
		expect(published.at(-1)).toMatchObject({
			event: GAME_EVENTS.answerCount,
			payload: { questionIndex: 0, count: 1 },
		});
	});

	it("rejects malformed play input before any use case runs", async () => {
		const { host, visitor, gameId, ana } = await answering();

		await expect(
			host.game.advance({
				gameId,
				// @ts-expect-error not a phase
				from: { questionIndex: 0, phase: "scoreboard" },
			}),
		).rejects.toMatchObject({
			code: "BAD_REQUEST",
			cause: { name: "ZodError" },
		});
		await expect(
			visitor.game.join.answer({
				...ana,
				questionIndex: 0,
				choiceIds: Array.from({ length: 7 }, (_, index) => `choice-${index}`),
			}),
		).rejects.toMatchObject({
			code: "BAD_REQUEST",
			cause: { name: "ZodError" },
		});
	});
});
