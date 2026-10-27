import {
	DEFAULT_ASSIGNMENT_OPTIONS,
	newAssignment,
} from "@quizio/core/game/domain/assignment";
import { aGame, aPlayer } from "@quizio/core/game/testing/a-game";
import { aPublishedQuiz } from "@quizio/core/quiz/testing/a-quiz";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { user } from "../../schema/auth";
import {
	assignmentPreferences,
	game as gameTable,
	hostPreferences,
} from "../../schema/game";
import { quiz as quizTable } from "../../schema/quiz";
import { report as reportTable } from "../../schema/reports";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleQuizRepository } from "../quiz/drizzle-quiz-repository";
import { createDrizzleAssignmentLandingQuery } from "./drizzle-assignment-landing-query";
import { createDrizzleAssignmentPreferencesRepository } from "./drizzle-assignment-preferences-repository";
import { createDrizzleGameRepository } from "./drizzle-game-repository";
import { createDrizzlePlayerRepository } from "./drizzle-player-repository";

const now = new Date("2026-06-01T12:00:00.000Z");

describe("assignment reads (spec 029)", () => {
	let testDb: TestDatabase;
	let games: ReturnType<typeof createDrizzleGameRepository>;
	let players: ReturnType<typeof createDrizzlePlayerRepository>;
	let preferences: ReturnType<
		typeof createDrizzleAssignmentPreferencesRepository
	>;
	let landing: ReturnType<typeof createDrizzleAssignmentLandingQuery>;

	beforeAll(async () => {
		testDb = await createTestDb();
		await testDb.db.insert(user).values([
			{ id: "user-1", name: "Ana Souza", email: "ana@quizio.test" },
			{ id: "user-2", name: "Bia", email: "bia@quizio.test" },
		]);
		games = createDrizzleGameRepository(testDb.db);
		players = createDrizzlePlayerRepository(testDb.db);
		preferences = createDrizzleAssignmentPreferencesRepository(
			testDb.db,
			() => now,
		);
		landing = createDrizzleAssignmentLandingQuery(testDb.db);
	});

	afterAll(() => testDb.close());

	beforeEach(async () => {
		await testDb.db.delete(gameTable);
		await testDb.db.delete(quizTable);
		await testDb.db.delete(assignmentPreferences);
		await testDb.db.delete(hostPreferences);
	});

	describe("assignment preferences", () => {
		it("is null for a creator who never assigned", async () => {
			expect(await preferences.find("user-1")).toBeNull();
		});

		it("saves and replaces the options", async () => {
			const options = {
				gameCharacters: true,
				questionTimer: false,
				randomizeAnswers: true,
			};

			await preferences.save("user-1", DEFAULT_ASSIGNMENT_OPTIONS);
			await preferences.save("user-1", options);

			expect(await preferences.find("user-1")).toEqual(options);
			expect(await preferences.find("user-2")).toBeNull();
		});

		it("leaves host_preferences alone", async () => {
			await preferences.save("user-1", DEFAULT_ASSIGNMENT_OPTIONS);

			expect(await testDb.db.select().from(hostPreferences)).toEqual([]);
		});
	});

	describe("the activity's screen", () => {
		const assignment = newAssignment({
			id: "a-1",
			ownerId: "user-1",
			quizId: "quiz-1",
			quizVersion: 1,
			title: "Capitais",
			pin: "04352236",
			deadline: new Date("2026-06-04T12:00:00.000Z"),
			options: DEFAULT_ASSIGNMENT_OPTIONS,
			questionCount: 2,
			themeId: "standard",
			now,
		});

		it("gives the assignment's theme (spec 042)", async () => {
			await games.create({ ...assignment, themeId: "beige" });

			expect((await landing.find("a-1"))?.themeId).toBe("beige");
		});

		it("gives the game's title and the creator's name", async () => {
			await games.create(assignment);

			expect(await landing.find("a-1")).toEqual({
				gameId: "a-1",
				name: "Capitais",
				creatorName: "Ana Souza",
				expiresAt: assignment.expiresAt,
				endedAt: null,
				participantCount: 0,
				coverImageKey: null,
				questionCount: 2,
				themeId: "standard",
			});
		});

		it("gives the quiz's cover and the question count (spec 030)", async () => {
			await createDrizzleQuizRepository(testDb.db).save(
				aPublishedQuiz({
					id: "quiz-1",
					ownerId: "user-1",
					coverImageKey: "media/user-1/cover.png",
				}),
			);
			await games.create(assignment);

			expect(await landing.find("a-1")).toMatchObject({
				coverImageKey: "media/user-1/cover.png",
				questionCount: 2,
			});
		});

		it("the cover is null once the quiz was deleted (spec 030)", async () => {
			await games.create(assignment);

			expect((await landing.find("a-1"))?.coverImageKey).toBeNull();
		});

		it("gives the report's name once renamed", async () => {
			await games.create(assignment);
			await testDb.db
				.insert(reportTable)
				.values({ gameId: "a-1", name: "Capitais — Turma A" });

			expect((await landing.find("a-1"))?.name).toBe("Capitais — Turma A");
		});

		it("counts players who were not removed", async () => {
			await games.create(assignment);
			await players.save(
				aPlayer({ id: "p-1", gameId: "a-1", nickname: "Ana" }),
			);
			await players.save(
				aPlayer({
					id: "p-2",
					gameId: "a-1",
					nickname: "Bia",
					secret: "secret-2",
					removedAt: now,
				}),
			);

			expect((await landing.find("a-1"))?.participantCount).toBe(1);
		});

		it("is null for a live game", async () => {
			await games.create(aGame({ id: "live" }));

			expect(await landing.find("live")).toBeNull();
			expect(await landing.find("nope")).toBeNull();
		});
	});
});
