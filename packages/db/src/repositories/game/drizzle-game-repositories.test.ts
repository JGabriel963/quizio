import { endGame } from "@quizio/core/game/domain/game";
import { removePlayer } from "@quizio/core/game/domain/player";
import { aGame, aPlayer } from "@quizio/core/game/testing/a-game";
import { aPublishedQuiz, aQuiz } from "@quizio/core/quiz/testing/a-quiz";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { user } from "../../schema/auth";
import { game as gameTable } from "../../schema/game";
import { quiz as quizTable } from "../../schema/quiz";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleQuizRepository } from "../quiz/drizzle-quiz-repository";
import { createDrizzleGameRepository } from "./drizzle-game-repository";
import { createDrizzlePlayableQuizQuery } from "./drizzle-playable-quiz-query";
import { createDrizzlePlayerRepository } from "./drizzle-player-repository";

const at = (iso: string) => new Date(iso);

describe("game repositories (spec 008)", () => {
	let testDb: TestDatabase;
	let games: ReturnType<typeof createDrizzleGameRepository>;
	let players: ReturnType<typeof createDrizzlePlayerRepository>;
	let quizzes: ReturnType<typeof createDrizzleQuizRepository>;

	beforeAll(async () => {
		testDb = await createTestDb();
		await testDb.db
			.insert(user)
			.values([{ id: "user-1", name: "Ana", email: "ana@quizio.test" }]);
		games = createDrizzleGameRepository(testDb.db);
		players = createDrizzlePlayerRepository(testDb.db);
		quizzes = createDrizzleQuizRepository(testDb.db);
	});

	afterAll(() => testDb.close());

	beforeEach(async () => {
		await testDb.db.delete(gameTable);
		await testDb.db.delete(quizTable);
		await quizzes.save(aPublishedQuiz({ id: "quiz-1" }));
		await quizzes.save(aPublishedQuiz({ id: "quiz-2" }));
	});

	describe("DrizzleGameRepository", () => {
		it("stores and reads a game back", async () => {
			const game = aGame({ createdAt: at("2026-06-01T12:00:00.123Z") });

			expect(await games.create(game)).toBe("created");

			expect(await games.findById("game-1")).toEqual(game);
			expect(await games.findUnendedByPin("265914")).toEqual(game);
			expect(await games.findById("missing")).toBeNull();
		});

		it("refuses a PIN held by a game that was not ended", async () => {
			await games.create(aGame());

			expect(
				await games.create(aGame({ id: "game-2", quizId: "quiz-2" })),
			).toBe("pinTaken");
			expect(await games.findById("game-2")).toBeNull();
		});

		it("frees the PIN once the game is ended", async () => {
			await games.create(aGame());
			await games.save(
				endGame(aGame(), "host", at("2026-06-01T13:00:00.000Z")),
			);

			expect(await games.findUnendedByPin("265914")).toBeNull();
			expect(
				await games.create(aGame({ id: "game-2", quizId: "quiz-2" })),
			).toBe("created");
			expect(await games.findById("game-1")).toMatchObject({
				status: "ended",
				endReason: "host",
				endedAt: at("2026-06-01T13:00:00.000Z"),
			});
		});

		it("stores when the game started (spec 015)", async () => {
			const startedAt = at("2026-06-01T12:03:00.456Z");
			await games.create(aGame());

			expect((await games.findById("game-1"))?.startedAt).toBeNull();
			await games.save({ ...aGame(), startedAt });

			expect((await games.findById("game-1"))?.startedAt).toEqual(startedAt);
		});

		it("deleting the quiz keeps its games (spec 015)", async () => {
			await games.create(aGame());

			await quizzes.delete("quiz-1");

			expect(await games.findById("game-1")).toMatchObject({
				quizId: "quiz-1",
			});
		});

		it("deleteUnstartedByQuiz drops the games that never started and keeps the others (spec 015)", async () => {
			const ended = at("2026-06-01T12:30:00.000Z");
			await games.create(aGame({ id: "lobby", pin: "111111" }));
			await games.create(
				aGame({
					id: "ended-in-lobby",
					pin: "222222",
					status: "ended",
					endedAt: ended,
					endReason: "host",
				}),
			);
			await games.create(
				aGame({
					id: "finished",
					pin: "333333",
					status: "finished",
					questionCount: 3,
					endedAt: ended,
				}),
			);
			await games.create(
				aGame({ id: "other-quiz", pin: "444444", quizId: "quiz-2" }),
			);

			await games.deleteUnstartedByQuiz("quiz-1");

			expect(await games.findById("lobby")).toBeNull();
			expect(await games.findById("ended-in-lobby")).toBeNull();
			expect(await games.findById("finished")).not.toBeNull();
			expect(await games.findById("other-quiz")).not.toBeNull();
		});

		it("saves the padlock", async () => {
			await games.create(aGame());

			await games.save(aGame({ locked: true }));

			expect((await games.findById("game-1"))?.locked).toBe(true);
		});

		it("lists the unended games of a quiz", async () => {
			await games.create(aGame({ id: "a", pin: "111111" }));
			await games.create(
				endGame(
					aGame({ id: "b", pin: "222222" }),
					"host",
					at("2026-06-01T13:00:00.000Z"),
				),
			);
			await games.create(aGame({ id: "c", pin: "333333", quizId: "quiz-2" }));

			expect(
				(await games.listUnendedByQuiz("quiz-1")).map((game) => game.id),
			).toEqual(["a"]);
		});

		it("an unstarted game deleted with its quiz takes its players", async () => {
			await games.create(aGame());
			await players.add(aPlayer());

			// What deleting a quiz for good does to its games (spec 015, RN-05).
			await games.deleteUnstartedByQuiz("quiz-1");
			await quizzes.delete("quiz-1");

			expect(await games.findById("game-1")).toBeNull();
			expect(await players.findById("player-1")).toBeNull();
		});
	});

	describe("DrizzlePlayerRepository", () => {
		beforeEach(async () => {
			await testDb.db.delete(gameTable);
			await games.create(aGame());
			await games.create(
				aGame({ id: "game-2", pin: "569177", quizId: "quiz-2" }),
			);
		});

		it("stores and reads a player back", async () => {
			const player = aPlayer({ joinedAt: at("2026-06-01T12:01:00.456Z") });

			expect(await players.add(player)).toBe("added");

			expect(await players.findById("player-1")).toEqual(player);
		});

		it("lists the active players in order of arrival", async () => {
			await players.add(
				aPlayer({
					id: "p2",
					nickname: "Bia",
					joinedAt: at("2026-06-01T12:02:00.000Z"),
				}),
			);
			await players.add(
				aPlayer({
					id: "p1",
					nickname: "Ana",
					joinedAt: at("2026-06-01T12:01:00.000Z"),
				}),
			);
			await players.add(
				aPlayer({
					id: "p3",
					nickname: "Caio",
					joinedAt: at("2026-06-01T12:03:00.000Z"),
				}),
			);
			await players.add(
				aPlayer({ id: "p4", gameId: "game-2", nickname: "Davi" }),
			);
			await players.save(
				removePlayer(
					aPlayer({
						id: "p3",
						nickname: "Caio",
						joinedAt: at("2026-06-01T12:03:00.000Z"),
					}),
					at("2026-06-01T12:05:00.000Z"),
				),
			);

			expect(
				(await players.listActive("game-1")).map((player) => player.nickname),
			).toEqual(["Ana", "Bia"]);
			expect(await players.countActive("game-1")).toBe(2);
			expect(await players.countActive("game-2")).toBe(1);
		});

		it("refuses a nickname key already in the game, removed players included", async () => {
			await players.add(aPlayer({ id: "p1", nickname: "José" }));
			await players.save(
				removePlayer(
					aPlayer({ id: "p1", nickname: "José" }),
					at("2026-06-01T12:05:00.000Z"),
				),
			);

			expect(await players.add(aPlayer({ id: "p2", nickname: "jose" }))).toBe(
				"nicknameTaken",
			);
			expect(await players.findById("p2")).toBeNull();
		});

		it("the same nickname is free in another game", async () => {
			await players.add(aPlayer({ id: "p1", nickname: "ACT" }));

			expect(
				await players.add(
					aPlayer({ id: "p2", gameId: "game-2", nickname: "ACT" }),
				),
			).toBe("added");
		});
	});

	describe("DrizzlePlayableQuizQuery", () => {
		it("reads what hosting needs", async () => {
			const query = createDrizzlePlayableQuizQuery(testDb.db);
			await quizzes.save(
				aPublishedQuiz({
					id: "quiz-1",
					title: "Capitais",
					publishedVersion: 3,
				}),
			);
			await quizzes.save(aQuiz({ id: "draft" }));
			await quizzes.save(
				aPublishedQuiz({
					id: "trashed",
					trashedAt: at("2026-05-01T00:00:00.000Z"),
				}),
			);

			expect(await query.find("quiz-1")).toEqual({
				id: "quiz-1",
				ownerId: "user-1",
				title: "Capitais",
				version: 3,
				trashed: false,
			});
			expect(await query.find("draft")).toMatchObject({ version: null });
			expect(await query.find("trashed")).toMatchObject({ trashed: true });
			expect(await query.find("missing")).toBeNull();
		});
	});
});
