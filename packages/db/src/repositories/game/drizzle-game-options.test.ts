import { nextStage } from "@quizio/core/game/domain/game-progress";
import { aGame, aPlayer, aPlayingGame } from "@quizio/core/game/testing/a-game";
import { aPublishedQuiz } from "@quizio/core/quiz/testing/a-quiz";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { user } from "../../schema/auth";
import { hostPreferences } from "../../schema/game";
import { quiz as quizTable } from "../../schema/quiz";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleQuizRepository } from "../quiz/drizzle-quiz-repository";
import { createDrizzleGameRepository } from "./drizzle-game-repository";
import { createDrizzleHostPreferencesRepository } from "./drizzle-host-preferences-repository";
import { createDrizzlePlayerRepository } from "./drizzle-player-repository";

const now = new Date("2026-06-01T12:00:00.000Z");

const options = {
	showQuestionsOnDevices: true,
	randomizeQuestions: false,
	randomizeAnswers: true,
};

describe("game options repositories (spec 012)", () => {
	let testDb: TestDatabase;
	let games: ReturnType<typeof createDrizzleGameRepository>;
	let players: ReturnType<typeof createDrizzlePlayerRepository>;
	let preferences: ReturnType<typeof createDrizzleHostPreferencesRepository>;
	let quizzes: ReturnType<typeof createDrizzleQuizRepository>;

	beforeAll(async () => {
		testDb = await createTestDb();
		await testDb.db.insert(user).values([
			{ id: "user-1", name: "Ana", email: "ana@quizio.test" },
			{ id: "user-2", name: "Bia", email: "bia@quizio.test" },
			{ id: "user-3", name: "Caio", email: "caio@quizio.test" },
		]);
		games = createDrizzleGameRepository(testDb.db);
		players = createDrizzlePlayerRepository(testDb.db);
		preferences = createDrizzleHostPreferencesRepository(testDb.db);
		quizzes = createDrizzleQuizRepository(testDb.db);
	});

	afterAll(() => testDb.close());

	beforeEach(async () => {
		// Games and players go with the quiz.
		await testDb.db.delete(quizTable);
		await testDb.db.delete(hostPreferences);
		await quizzes.save(aPublishedQuiz({ id: "quiz-1" }));
	});

	describe("the options of a game", () => {
		it("stores and reads the options", async () => {
			const game = aGame({ options });

			await games.create(game);

			expect(await games.findById("game-1")).toEqual(game);
			expect((await games.findUnendedByPin("265914"))?.options).toEqual(
				options,
			);
		});

		it("saveOptions writes only the options it is given", async () => {
			await games.create(aGame({ locked: true }));

			await games.saveOptions("game-1", { showQuestionsOnDevices: true });
			await games.saveOptions("game-1", { randomizeAnswers: true });

			expect(await games.findById("game-1")).toEqual(
				aGame({ locked: true, options }),
			);
		});

		it("saveLocked writes only the lock", async () => {
			await games.create(aGame({ options }));

			await games.saveLocked("game-1", true);

			expect(await games.findById("game-1")).toEqual(
				aGame({ locked: true, options }),
			);
			await games.saveLocked("game-1", false);
			expect((await games.findById("game-1"))?.locked).toBe(false);
		});

		it("saveOptions with nothing to change changes nothing", async () => {
			await games.create(aGame({ options }));

			await games.saveOptions("game-1", {});

			expect(await games.findById("game-1")).toEqual(aGame({ options }));
		});

		it("the settings do not undo an advance", async () => {
			const answering = aPlayingGame("answering", { since: now });
			await games.create(answering);
			// The game moves on after a request read it at the answers.
			const results = nextStage(answering, {
				timeLimitSeconds: 20,
				skip: true,
				now: new Date("2026-06-01T12:00:05.000Z"),
			});
			await games.saveIfAt(results, { questionIndex: 0, phase: "answering" });

			await games.saveLocked("game-1", true);
			await games.saveOptions("game-1", options);

			expect(await games.findById("game-1")).toEqual({
				...results,
				locked: true,
				options,
			});
		});

		it("an advance leaves the options alone", async () => {
			const answering = aPlayingGame("answering", { since: now });
			await games.create({ ...answering, options });

			await games.saveIfAt(
				nextStage(answering, { timeLimitSeconds: 20, skip: true, now }),
				{ questionIndex: 0, phase: "answering" },
			);

			expect((await games.findById("game-1"))?.options).toEqual(options);
		});
	});

	describe("players who joined in the middle", () => {
		beforeEach(async () => {
			await games.create(aGame());
			await players.add(aPlayer({ id: "p1", nickname: "Ana" }));
			await players.add(aPlayer({ id: "p2", nickname: "Bia" }));
		});

		it("stores the first question of who joined", async () => {
			const late = aPlayer({
				id: "p3",
				nickname: "Caio",
				firstQuestionIndex: 2,
			});

			await players.add(late);

			expect(await players.findById("p3")).toEqual(late);
			expect((await players.findById("p1"))?.firstQuestionIndex).toBe(0);
		});

		it("counts who may answer a question", async () => {
			await players.add(
				aPlayer({ id: "p3", nickname: "Caio", firstQuestionIndex: 2 }),
			);
			await players.add(
				aPlayer({
					id: "p4",
					nickname: "Duda",
					firstQuestionIndex: 1,
					removedAt: now,
				}),
			);

			expect(await players.countEligible("game-1", 0)).toBe(2);
			expect(await players.countEligible("game-1", 1)).toBe(2);
			expect(await players.countEligible("game-1", 2)).toBe(3);
			expect(await players.countEligible("missing", 0)).toBe(0);
			// Everybody still counts as a player of the game.
			expect(await players.countActive("game-1")).toBe(3);
		});
	});

	describe("DrizzleHostPreferencesRepository", () => {
		it("has nothing for a host who never saved", async () => {
			expect(await preferences.find("user-1")).toBeNull();
		});

		it("saves and reads", async () => {
			await preferences.save("user-1", options);

			expect(await preferences.find("user-1")).toEqual(options);
			expect(await preferences.find("user-2")).toBeNull();
		});

		it("saves again over what was there", async () => {
			await preferences.save("user-1", options);

			await preferences.save("user-1", {
				...options,
				showQuestionsOnDevices: false,
				randomizeQuestions: true,
			});

			expect(await preferences.find("user-1")).toEqual({
				showQuestionsOnDevices: false,
				randomizeQuestions: true,
				randomizeAnswers: true,
			});
		});

		it("saves only the options it is given, over the ones kept", async () => {
			// A first save of one option leaves the others off.
			await preferences.save("user-1", { randomizeAnswers: true });
			expect(await preferences.find("user-1")).toEqual({
				showQuestionsOnDevices: false,
				randomizeQuestions: false,
				randomizeAnswers: true,
			});

			await preferences.save("user-1", { showQuestionsOnDevices: true });

			expect(await preferences.find("user-1")).toEqual({
				showQuestionsOnDevices: true,
				randomizeQuestions: false,
				randomizeAnswers: true,
			});
		});

		it("goes away with the user", async () => {
			await preferences.save("user-3", options);

			await testDb.db.delete(user).where(eq(user.id, "user-3"));

			expect(await preferences.find("user-3")).toBeNull();
		});
	});
});
