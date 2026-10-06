import { describe, expect, it } from "vitest";

import {
	GAME_TTL_MS,
	GameQuizNotFoundError,
	QuizNotPlayableError,
} from "../domain/game";
import { GAME_EVENTS, gameChannel } from "../domain/game-events";
import { DEFAULT_GAME_OPTIONS } from "../domain/game-options";
import { aGame } from "../testing/a-game";
import { createGameDeps } from "../testing/game-deps";
import { aPlayableQuiz } from "../testing/in-memory-playable-quiz-query";
import { createEndGamesOfQuiz } from "./end-games-of-quiz";
import { createHostGame } from "./host-game";

const host = { ownerId: "user-1", quizId: "quiz-1" };

describe("hostGame (spec 008)", () => {
	it("opens an unlocked lobby with a PIN, the quiz's version and title", async () => {
		const deps = createGameDeps({
			quizzes: [aPlayableQuiz({ title: "Capitais", version: 3 })],
		});

		const { gameId } = await createHostGame(deps)(host);

		expect(await deps.games.findById(gameId)).toMatchObject({
			ownerId: "user-1",
			quizId: "quiz-1",
			quizVersion: 3,
			title: "Capitais",
			pin: "265914",
			status: "lobby",
			locked: false,
		});
	});

	it("keeps the version and title it was created with", async () => {
		const deps = createGameDeps({
			quizzes: [aPlayableQuiz({ title: "Capitais", version: 1 })],
		});
		const { gameId } = await createHostGame(deps)(host);

		deps.quizzes[0] = aPlayableQuiz({ title: "Geografia", version: 2 });

		expect(await deps.games.findById(gameId)).toMatchObject({
			title: "Capitais",
			quizVersion: 1,
		});
	});

	it("refuses a draft", async () => {
		const deps = createGameDeps({
			quizzes: [aPlayableQuiz({ version: null })],
		});

		await expect(createHostGame(deps)(host)).rejects.toThrow(
			QuizNotPlayableError,
		);
		expect(deps.games.all()).toEqual([]);
	});

	it("refuses a quiz in the trash", async () => {
		const deps = createGameDeps({
			quizzes: [aPlayableQuiz({ trashed: true })],
		});

		await expect(createHostGame(deps)(host)).rejects.toThrow(
			QuizNotPlayableError,
		);
	});

	it("another owner's quiz is not found, like a missing one", async () => {
		const deps = createGameDeps();
		const hostGame = createHostGame(deps);

		await expect(
			hostGame({ ownerId: "user-2", quizId: "quiz-1" }),
		).rejects.toThrow(GameQuizNotFoundError);
		await expect(
			hostGame({ ownerId: "user-1", quizId: "missing" }),
		).rejects.toThrow(GameQuizNotFoundError);
	});

	it("a new game replaces the open one of the same quiz", async () => {
		const deps = createGameDeps({ pins: ["265914", "569177"] });
		const hostGame = createHostGame(deps);
		const first = await hostGame(host);

		const second = await hostGame(host);

		expect(await deps.games.findById(first.gameId)).toMatchObject({
			status: "ended",
			endReason: "replaced",
		});
		expect(await deps.games.findById(second.gameId)).toMatchObject({
			status: "lobby",
			pin: "569177",
		});
		expect(deps.realtime.messagesOn(gameChannel(first.gameId))).toEqual([
			{
				channel: gameChannel(first.gameId),
				event: GAME_EVENTS.gameEnded,
				payload: { reason: "replaced" },
			},
		]);
	});

	it("two requests at the same time leave one open game of the quiz", async () => {
		const deps = createGameDeps({ pins: ["111111", "222222", "333333"] });
		const hostGame = createHostGame(deps);

		const [first, second] = await Promise.all([hostGame(host), hostGame(host)]);

		const open = await deps.games.listUnendedByQuiz("quiz-1");
		expect(open).toHaveLength(1);
		const replaced = [first, second].find(
			({ gameId }) => gameId !== open[0]?.id,
		);
		expect(await deps.games.findById(replaced?.gameId ?? "")).toMatchObject({
			status: "ended",
			endReason: "replaced",
		});
	});

	it("games of different quizzes stay open side by side", async () => {
		const deps = createGameDeps({
			quizzes: [aPlayableQuiz(), aPlayableQuiz({ id: "quiz-2" })],
			pins: ["265914", "569177"],
		});
		const hostGame = createHostGame(deps);

		const first = await hostGame(host);
		await hostGame({ ownerId: "user-1", quizId: "quiz-2" });

		expect(await deps.games.findById(first.gameId)).toMatchObject({
			status: "lobby",
		});
	});

	it("draws again when the PIN belongs to an open game", async () => {
		const deps = createGameDeps({ pins: ["265914", "569177"] });
		await deps.games.save(aGame({ id: "other", quizId: "quiz-9" }));

		const { gameId } = await createHostGame(deps)(host);

		expect((await deps.games.findById(gameId))?.pin).toBe("569177");
	});

	it("reuses the PIN of a game past its deadline", async () => {
		const deps = createGameDeps({ pins: ["265914"] });
		await deps.games.save(
			aGame({ id: "old", quizId: "quiz-9", createdAt: deps.clock.now() }),
		);
		deps.clock.advanceBy(GAME_TTL_MS);

		const { gameId } = await createHostGame(deps)(host);

		expect((await deps.games.findById(gameId))?.pin).toBe("265914");
		expect(await deps.games.findById("old")).toMatchObject({
			status: "ended",
			endReason: "expired",
		});
	});

	it("gives up when no free PIN is drawn", async () => {
		const deps = createGameDeps({ pins: Array(5).fill("265914") });
		await deps.games.save(aGame({ id: "other", quizId: "quiz-9" }));

		await expect(createHostGame(deps)(host)).rejects.toThrow(/free game PIN/);
	});

	it("a first game starts with every option off (spec 012)", async () => {
		const deps = createGameDeps();

		const { gameId } = await createHostGame(deps)(host);

		expect((await deps.games.findById(gameId))?.options).toEqual(
			DEFAULT_GAME_OPTIONS,
		);
	});

	it("a new game starts with the options the host saved (spec 012)", async () => {
		const deps = createGameDeps();
		const saved = {
			showQuestionsOnDevices: true,
			randomizeQuestions: false,
			randomizeAnswers: true,
			autoplay: false,
		};
		await deps.preferences.save("user-1", saved);
		await deps.preferences.save("user-2", {
			...saved,
			randomizeQuestions: true,
		});

		const { gameId } = await createHostGame(deps)(host);

		expect((await deps.games.findById(gameId))?.options).toEqual(saved);
	});

	it("a game of a host with autoplay saved starts with it on (spec 014)", async () => {
		const deps = createGameDeps();
		await deps.preferences.save("user-1", { autoplay: true });

		const { gameId } = await createHostGame(deps)(host);

		expect(await deps.games.findById(gameId)).toMatchObject({
			options: { ...DEFAULT_GAME_OPTIONS, autoplay: true },
			autoplaySince: deps.clock.now(),
		});
	});

	it("a first game has autoplay off (spec 014)", async () => {
		const deps = createGameDeps();

		const { gameId } = await createHostGame(deps)(host);

		expect((await deps.games.findById(gameId))?.autoplaySince).toBeNull();
	});

	it("a new game is never locked (spec 012)", async () => {
		const deps = createGameDeps({ pins: ["265914", "569177"] });
		const hostGame = createHostGame(deps);
		const first = await hostGame(host);
		const stored = await deps.games.findById(first.gameId);
		await deps.games.save({ ...aGame(), ...stored, locked: true });

		const second = await hostGame(host);

		expect((await deps.games.findById(second.gameId))?.locked).toBe(false);
	});
});

describe("endGamesOfQuiz (spec 008)", () => {
	it("ends the open games of the quiz with the reason, and only those", async () => {
		const deps = createGameDeps();
		await deps.games.save(aGame({ id: "a" }));
		await deps.games.save(aGame({ id: "b", quizId: "quiz-2", pin: "111111" }));

		await createEndGamesOfQuiz(deps)({
			quizId: "quiz-1",
			reason: "quizDeleted",
		});

		expect(await deps.games.findById("a")).toMatchObject({
			status: "ended",
			endReason: "quizDeleted",
		});
		expect(await deps.games.findById("b")).toMatchObject({ status: "lobby" });
		expect(deps.realtime.messages).toHaveLength(1);
	});

	it("a failing publisher does not undo the ending", async () => {
		const deps = createGameDeps();
		await deps.games.save(aGame({ id: "a" }));
		deps.realtime.publish = async () => {
			throw new Error("realtime is down");
		};

		await createEndGamesOfQuiz(deps)({ quizId: "quiz-1", reason: "host" });

		expect(await deps.games.findById("a")).toMatchObject({ status: "ended" });
	});
});
