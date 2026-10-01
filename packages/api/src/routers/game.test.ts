import { GAME_EVENTS, gameChannel } from "@quizio/core/game/domain/game-events";
import { PIN_ATTEMPT_LIMIT } from "@quizio/core/game/domain/game-pin";
import { aPublishedQuiz, aQuiz } from "@quizio/core/quiz/testing/a-quiz";
import { describe, expect, it } from "vitest";

import { createTestApi } from "../testing/test-context";

const trashedAt = new Date("2026-05-01T00:00:00.000Z");

async function published() {
	const api = createTestApi();
	await api.quizzes.save(aPublishedQuiz({ title: "Capitais" }));
	return api;
}

async function hosted() {
	const api = await published();
	const host = api.callerFor("user-1");
	const { gameId } = await host.game.host({ quizId: "quiz-1" });
	const { pin } = await host.game.lobby({ gameId });
	return { api, host, gameId, pin };
}

describe("game router: the host (spec 008)", () => {
	it("hosts a published quiz and shows its lobby", async () => {
		const { host, gameId, pin } = await hosted();

		expect(pin).toMatch(/^[1-9]\d{5}$/);
		expect(await host.game.lobby({ gameId })).toEqual({
			gameId,
			quizId: "quiz-1",
			title: "Capitais",
			pin,
			status: "lobby",
			endReason: null,
			locked: false,
			players: [],
		});
	});

	it("requires a session to host and to open the lobby", async () => {
		const { api, gameId } = await hosted();
		const visitor = api.callerFor(null);

		await expect(visitor.game.host({ quizId: "quiz-1" })).rejects.toMatchObject(
			{ code: "UNAUTHORIZED" },
		);
		await expect(visitor.game.lobby({ gameId })).rejects.toMatchObject({
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
			other.game.lobby({ gameId }),
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

		expect(await host.game.lobby({ gameId })).toMatchObject({
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
		).toEqual({ gameId, nickname: "ACT", status: "waiting" });
		expect((await host.game.lobby({ gameId })).players).toEqual([
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
