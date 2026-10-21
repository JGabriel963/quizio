import {
	DEFAULT_ASSIGNMENT_OPTIONS,
	newAssignment,
} from "@quizio/core/game/domain/assignment";
import { aGame } from "@quizio/core/game/testing/a-game";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { user } from "../../schema/auth";
import { game as gameTable } from "../../schema/game";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleGameRepository } from "./drizzle-game-repository";

const now = new Date("2026-06-01T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const inDays = (days: number) => new Date(now.getTime() + days * DAY_MS);

function anAssignment(
	id: string,
	pin: string,
	overrides: Partial<Parameters<typeof newAssignment>[0]> = {},
) {
	return newAssignment({
		id,
		ownerId: "user-1",
		quizId: "quiz-1",
		quizVersion: 1,
		title: "Capitais",
		pin,
		deadline: inDays(3),
		options: DEFAULT_ASSIGNMENT_OPTIONS,
		questionCount: 2,
		now,
		...overrides,
	});
}

describe("assignments in the game repository (spec 029)", () => {
	let testDb: TestDatabase;
	let games: ReturnType<typeof createDrizzleGameRepository>;

	beforeAll(async () => {
		testDb = await createTestDb();
		await testDb.db
			.insert(user)
			.values([{ id: "user-1", name: "Ana", email: "ana@quizio.test" }]);
		games = createDrizzleGameRepository(testDb.db);
	});

	afterAll(() => testDb.close());

	beforeEach(async () => {
		await testDb.db.delete(gameTable);
	});

	it("stores and reads back an assignment's mode and question timer", async () => {
		const assignment = anAssignment("a-1", "04352236", {
			options: {
				gameCharacters: true,
				questionTimer: false,
				randomizeAnswers: true,
			},
		});

		await games.create(assignment);

		expect(await games.findById("a-1")).toEqual(assignment);
	});

	it("old rows read as live with the timer on", async () => {
		await testDb.db.execute(sql`
			insert into game (id, owner_id, quiz_id, quiz_version, title, pin, created_at, expires_at)
			values ('old', 'user-1', 'quiz-1', 1, 'Capitais', '265914', now(), now() + interval '8 hours')
		`);

		expect(await games.findById("old")).toMatchObject({
			mode: "live",
			questionTimer: true,
		});
	});

	it("two open assignments of one quiz are created", async () => {
		expect(await games.create(anAssignment("a-1", "00000001"))).toBe("created");
		expect(await games.create(anAssignment("a-2", "00000002"))).toBe("created");
	});

	it("an open live game and an open assignment of one quiz are both created", async () => {
		expect(await games.create(aGame({ id: "live" }))).toBe("created");
		expect(await games.create(anAssignment("a-1", "00000001"))).toBe("created");
	});

	it("a second open live game of one quiz is taken", async () => {
		await games.create(aGame({ id: "live-1", pin: "111111" }));

		expect(await games.create(aGame({ id: "live-2", pin: "222222" }))).toBe(
			"taken",
		);
	});

	it("saveDeadline writes only the deadline", async () => {
		await games.create(anAssignment("a-1", "00000001"));

		expect(await games.saveDeadline("a-1", inDays(10))).toBe(true);

		expect(await games.findById("a-1")).toEqual({
			...anAssignment("a-1", "00000001"),
			expiresAt: inDays(10),
		});
	});

	it("saveDeadline does nothing to an ended assignment", async () => {
		await games.create(anAssignment("a-1", "00000001"));
		await games.save({
			...anAssignment("a-1", "00000001"),
			status: "ended",
			endedAt: inDays(1),
			endReason: "host",
		});

		expect(await games.saveDeadline("a-1", inDays(10))).toBe(false);
		expect((await games.findById("a-1"))?.expiresAt).toEqual(inDays(3));
	});

	it("findLatestAssignmentByPin finds the newest one, ended or not", async () => {
		await games.save({
			...anAssignment("old", "00000001"),
			status: "ended",
			endedAt: inDays(1),
			endReason: "host",
		});
		await games.save({
			...anAssignment("new", "00000001", {
				now: inDays(2),
				deadline: inDays(4),
			}),
			status: "ended",
			endedAt: inDays(3),
			endReason: "expired",
		});
		await games.create(aGame({ id: "live", pin: "00000001" }));

		expect((await games.findLatestAssignmentByPin("00000001"))?.id).toBe("new");
		expect(await games.findLatestAssignmentByPin("00000002")).toBeNull();
	});

	it("listUnendedByQuiz filters by mode", async () => {
		await games.create(aGame({ id: "live" }));
		await games.create(anAssignment("a-1", "00000001"));

		expect(
			(await games.listUnendedByQuiz("quiz-1", ["live"])).map(({ id }) => id),
		).toEqual(["live"]);
		expect(
			(await games.listUnendedByQuiz("quiz-1", ["assignment"])).map(
				({ id }) => id,
			),
		).toEqual(["a-1"]);
		expect(await games.listUnendedByQuiz("quiz-1")).toHaveLength(2);
	});

	it("deleteUnstartedByQuiz keeps assignments", async () => {
		await games.create(anAssignment("a-1", "00000001"));

		await games.deleteUnstartedByQuiz("quiz-1");

		expect(await games.findById("a-1")).not.toBeNull();
	});
});
