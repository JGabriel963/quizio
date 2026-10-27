import {
	DEFAULT_ASSIGNMENT_OPTIONS,
	newAssignment,
} from "@quizio/core/game/domain/assignment";
import { aGame } from "@quizio/core/game/testing/a-game";
import { aPublishedQuiz } from "@quizio/core/quiz/testing/a-quiz";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { user } from "../../schema/auth";
import { game as gameTable } from "../../schema/game";
import { quiz as quizTable } from "../../schema/quiz";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleGameRepository } from "../game/drizzle-game-repository";
import { createDrizzleQuizRepository } from "../quiz/drizzle-quiz-repository";
import { createDrizzleReportRepository } from "../reports/drizzle-report-repository";
import { createDrizzleGroupAssignmentQuery } from "./drizzle-group-assignment-query";

const now = new Date("2026-10-26T12:00:00.000Z");
const deadline = new Date("2026-10-29T12:00:00.000Z");

const anAssignment = (id: string, pin: string) =>
	newAssignment({
		id,
		ownerId: "ana",
		quizId: "quiz-1",
		quizVersion: 1,
		title: "Capitais",
		pin,
		deadline,
		options: DEFAULT_ASSIGNMENT_OPTIONS,
		questionCount: 5,
		themeId: "standard",
		now,
	});

describe("DrizzleGroupAssignmentQuery (spec 038)", () => {
	let testDb: TestDatabase;
	let games: ReturnType<typeof createDrizzleGameRepository>;
	let quizzes: ReturnType<typeof createDrizzleQuizRepository>;
	let reports: ReturnType<typeof createDrizzleReportRepository>;
	let query: ReturnType<typeof createDrizzleGroupAssignmentQuery>;

	beforeAll(async () => {
		testDb = await createTestDb();
		await testDb.db
			.insert(user)
			.values([{ id: "ana", name: "Ana Souza", email: "ana@quizio.test" }]);
		games = createDrizzleGameRepository(testDb.db);
		quizzes = createDrizzleQuizRepository(testDb.db);
		reports = createDrizzleReportRepository(testDb.db);
		query = createDrizzleGroupAssignmentQuery(testDb.db);
	});

	afterAll(() => testDb.close());

	beforeEach(async () => {
		await testDb.db.delete(gameTable);
		await testDb.db.delete(quizTable);
		await quizzes.save(
			aPublishedQuiz({
				id: "quiz-1",
				ownerId: "ana",
				coverImageKey: "media/ana/cover.png",
			}),
		);
	});

	it("reads name (report's or game's), owner, cover, count, deadline and end", async () => {
		await games.create(anAssignment("a-1", "04352236"));
		await games.create(anAssignment("a-2", "11112222"));
		await reports.saveName("a-2", "Revisão");

		const records = await query.findAssignments(["a-1", "a-2"]);

		expect(records.sort((a, b) => a.gameId.localeCompare(b.gameId))).toEqual([
			{
				gameId: "a-1",
				ownerId: "ana",
				ownerName: "Ana Souza",
				name: "Capitais",
				questionCount: 5,
				coverImageKey: "media/ana/cover.png",
				expiresAt: deadline,
				endedAt: null,
			},
			expect.objectContaining({ gameId: "a-2", name: "Revisão" }),
		]);
		expect(await query.findAssignments([])).toEqual([]);
	});

	it("a deleted game and a live game are missing; a deleted quiz leaves no cover", async () => {
		await games.create(anAssignment("a-1", "04352236"));
		await games.create(
			aGame({ id: "live-1", ownerId: "ana", quizId: "quiz-1", pin: "123456" }),
		);
		await reports.delete(["a-1"]);
		await games.create(anAssignment("a-3", "33334444"));
		await quizzes.delete("quiz-1");

		const records = await query.findAssignments(["a-1", "live-1", "a-3"]);

		expect(records).toEqual([
			expect.objectContaining({ gameId: "a-3", coverImageKey: null }),
		]);
	});
});
