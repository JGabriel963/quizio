import { nextStage } from "@quizio/core/game/domain/game-progress";
import { aGame, aPlayingGame } from "@quizio/core/game/testing/a-game";
import { aPublishedQuiz } from "@quizio/core/quiz/testing/a-quiz";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { user } from "../../schema/auth";
import { quiz as quizTable } from "../../schema/quiz";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleQuizRepository } from "../quiz/drizzle-quiz-repository";
import { createDrizzleGameRepository } from "./drizzle-game-repository";

const now = new Date("2026-06-01T12:00:00.000Z");
const later = (ms: number) => new Date(now.getTime() + ms);
/** The answers of a 20 s question run out. */
const closing = { timeLimitSeconds: 20, skip: false, now: later(20_000) };

describe("the host's signal (spec 013)", () => {
	let testDb: TestDatabase;
	let games: ReturnType<typeof createDrizzleGameRepository>;
	let quizzes: ReturnType<typeof createDrizzleQuizRepository>;

	beforeAll(async () => {
		testDb = await createTestDb();
		await testDb.db
			.insert(user)
			.values([{ id: "user-1", name: "Ana", email: "ana@quizio.test" }]);
		games = createDrizzleGameRepository(testDb.db);
		quizzes = createDrizzleQuizRepository(testDb.db);
	});

	afterAll(() => testDb.close());

	beforeEach(async () => {
		// Games go with the quiz.
		await testDb.db.delete(quizTable);
		await quizzes.save(aPublishedQuiz({ id: "quiz-1" }));
	});

	it("keeps when the host was last seen", async () => {
		await games.create(aGame({ createdAt: now, hostSeenAt: later(1_000) }));

		expect((await games.findById("game-1"))?.hostSeenAt).toEqual(later(1_000));

		await games.saveHostSeen("game-1", later(5_000));

		expect((await games.findById("game-1"))?.hostSeenAt).toEqual(later(5_000));
	});

	it("saveHostSeen writes only that column: a stage and an option written before stay", async () => {
		const read = aPlayingGame("answering", { since: now }, { hostSeenAt: now });
		await games.create(read);
		// The game moves on and a switch is turned after the signal read it.
		const advanced = nextStage(read, closing);
		await games.saveIfAt(advanced, { questionIndex: 0, phase: "answering" });
		await games.saveOptions("game-1", { showQuestionsOnDevices: true });
		await games.saveLocked("game-1", true);

		await games.saveHostSeen("game-1", later(21_000));

		expect(await games.findById("game-1")).toEqual({
			...advanced,
			locked: true,
			options: { ...advanced.options, showQuestionsOnDevices: true },
			hostSeenAt: later(21_000),
		});
	});

	it("an advance does not write over a signal given meanwhile", async () => {
		const read = aPlayingGame("answering", { since: now }, { hostSeenAt: now });
		await games.create(read);
		await games.saveHostSeen("game-1", later(4_000));

		await games.saveIfAt(nextStage(read, closing), {
			questionIndex: 0,
			phase: "answering",
		});

		expect((await games.findById("game-1"))?.hostSeenAt).toEqual(later(4_000));
	});

	it("saveHostSeen of a game that is gone does nothing", async () => {
		await expect(games.saveHostSeen("nope", now)).resolves.toBeUndefined();
	});
});
