import { aGame, aPlayer } from "@quizio/core/game/testing/a-game";
import {
	aGameQuestion,
	anAnswer,
} from "@quizio/core/game/testing/a-game-question";
import { aPublishedQuiz } from "@quizio/core/quiz/testing/a-quiz";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { user } from "../../schema/auth";
import {
	gameAnswer,
	gamePlayer,
	gameQuestion,
	game as gameTable,
} from "../../schema/game";
import { quiz as quizTable } from "../../schema/quiz";
import { report as reportTable } from "../../schema/reports";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleAnswerRepository } from "../game/drizzle-answer-repository";
import { createDrizzleGameQuestionRepository } from "../game/drizzle-game-question-repository";
import { createDrizzleGameRepository } from "../game/drizzle-game-repository";
import { createDrizzlePlayerRepository } from "../game/drizzle-player-repository";
import { createDrizzleQuizRepository } from "../quiz/drizzle-quiz-repository";
import { createDrizzleReportGameQuery } from "./drizzle-report-game-query";
import { createDrizzleReportRepository } from "./drizzle-report-repository";

const at = (iso: string) => new Date(iso);
const now = at("2026-06-02T09:00:00.000Z");
const trashedAt = at("2026-06-01T20:00:00.000Z");

describe("DrizzleReportRepository (spec 015)", () => {
	let testDb: TestDatabase;
	let games: ReturnType<typeof createDrizzleGameRepository>;
	let quizzes: ReturnType<typeof createDrizzleQuizRepository>;
	let reports: ReturnType<typeof createDrizzleReportRepository>;
	let query: ReturnType<typeof createDrizzleReportGameQuery>;

	beforeAll(async () => {
		testDb = await createTestDb();
		await testDb.db
			.insert(user)
			.values([{ id: "user-1", name: "Ana", email: "ana@quizio.test" }]);
		games = createDrizzleGameRepository(testDb.db);
		quizzes = createDrizzleQuizRepository(testDb.db);
		reports = createDrizzleReportRepository(testDb.db);
		query = createDrizzleReportGameQuery(testDb.db);
	});

	afterAll(() => testDb.close());

	beforeEach(async () => {
		await testDb.db.delete(gameTable);
		await testDb.db.delete(quizTable);
		await quizzes.save(aPublishedQuiz({ id: "quiz-1" }));
		// Two games of the same quiz, both played to the end.
		for (const [id, pin] of [
			["game-1", "111111"],
			["game-2", "222222"],
		] as const) {
			await games.create(
				aGame({
					id,
					pin,
					title: "Capitais",
					status: "finished",
					questionCount: 1,
					endedAt: at("2026-06-01T12:13:00.000Z"),
				}),
			);
		}
	});

	const header = (gameId: string) => query.findHeader(gameId, now);

	it("saveName keeps the trash, saveTrashed keeps the name", async () => {
		await reports.saveTrashed(["game-1"], trashedAt);
		await reports.saveName("game-1", "Turma A");

		expect(await header("game-1")).toMatchObject({
			name: "Turma A",
			trashedAt,
		});

		await reports.saveName("game-1", "Turma A, manhã");
		await reports.saveTrashed(["game-1"], at("2026-06-01T21:00:00.000Z"));

		expect(await header("game-1")).toMatchObject({
			name: "Turma A, manhã",
			trashedAt: at("2026-06-01T21:00:00.000Z"),
		});
	});

	it("renaming or trashing one report leaves the other of the same quiz alone", async () => {
		await reports.saveName("game-1", "Turma A");
		await reports.saveTrashed(["game-1"], trashedAt);

		expect(await header("game-2")).toMatchObject({
			name: "Capitais",
			trashedAt: null,
		});
		// The game itself keeps its title.
		expect((await games.findById("game-1"))?.title).toBe("Capitais");
	});

	it("trashes several at once, and restoring clears the trash", async () => {
		await reports.saveTrashed(["game-1", "game-2"], trashedAt);
		expect((await header("game-2"))?.trashedAt).toEqual(trashedAt);

		await reports.saveTrashed(["game-1", "game-2"], null);

		expect((await header("game-1"))?.trashedAt).toBeNull();
		expect((await header("game-2"))?.trashedAt).toBeNull();
		await reports.saveTrashed([], trashedAt);
	});

	it("delete removes the game with players, questions and answers, and no quiz", async () => {
		const players = createDrizzlePlayerRepository(testDb.db);
		await players.add(aPlayer({ id: "p1", gameId: "game-1" }));
		await createDrizzleGameQuestionRepository(testDb.db).saveAll("game-1", [
			aGameQuestion(),
		]);
		await createDrizzleAnswerRepository(testDb.db).add(
			anAnswer({ gameId: "game-1", playerId: "p1" }),
		);
		await reports.saveName("game-1", "Turma A");

		await reports.delete(["game-1"]);
		await reports.delete([]);

		expect(await games.findById("game-1")).toBeNull();
		for (const table of [gamePlayer, gameQuestion, gameAnswer, reportTable]) {
			expect(await testDb.db.select().from(table)).toEqual([]);
		}
		expect(await games.findById("game-2")).not.toBeNull();
		expect(await quizzes.findById("quiz-1")).not.toBeNull();
	});
});
