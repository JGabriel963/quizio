import { aQuestion } from "@quizio/core/quiz/testing/a-question";
import { aQuiz } from "@quizio/core/quiz/testing/a-quiz";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { user } from "../../schema/auth";
import {
	question as questionTable,
	quiz as quizTable,
} from "../../schema/quiz";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleQuestionRepository } from "./drizzle-question-repository";
import { createDrizzleQuizRepository } from "./drizzle-quiz-repository";

const a = aQuestion({ id: "a", text: "A" });
const b = aQuestion({ id: "b", text: null });
const c = aQuestion({ id: "c", text: "C" });

describe("DrizzleQuestionRepository", () => {
	let testDb: TestDatabase;

	beforeAll(async () => {
		testDb = await createTestDb();
		await testDb.db
			.insert(user)
			.values([{ id: "user-1", name: "Ana", email: "ana@quizio.test" }]);
	});

	afterAll(() => testDb.close());

	beforeEach(async () => {
		await testDb.db.delete(quizTable);
		const quizzes = createDrizzleQuizRepository(testDb.db);
		await quizzes.save(aQuiz({ id: "quiz-1" }));
		await quizzes.save(aQuiz({ id: "quiz-2" }));
	});

	it("deleting a quiz cascades to its questions", async () => {
		await testDb.db.insert(questionTable).values([
			{ id: "a", type: "quiz", quizId: "quiz-1", position: 0 },
			{ id: "b", type: "quiz", quizId: "quiz-2", position: 0 },
		]);

		await testDb.db.delete(quizTable).where(eq(quizTable.id, "quiz-1"));

		const remaining = await testDb.db.select().from(questionTable);
		expect(remaining.map(({ id }) => id)).toEqual(["b"]);
	});

	it("lists a quiz's questions in saved order", async () => {
		const questions = createDrizzleQuestionRepository(testDb.db);

		await questions.saveList("quiz-1", [c, a, b]);

		expect(await questions.listByQuiz("quiz-1")).toEqual([c, a, b]);
		expect(await questions.listByQuiz("quiz-2")).toEqual([]);
	});

	it("saveList replaces the list, dropping missing questions", async () => {
		const questions = createDrizzleQuestionRepository(testDb.db);
		await questions.saveList("quiz-1", [a, b, c]);

		await questions.saveList("quiz-1", [c, { ...a, text: "A2" }]);

		expect(await questions.listByQuiz("quiz-1")).toEqual([
			c,
			{ ...a, text: "A2" },
		]);
	});

	it("saveList leaves other quizzes untouched", async () => {
		const questions = createDrizzleQuestionRepository(testDb.db);
		await questions.saveList("quiz-1", [a]);
		await questions.saveList("quiz-2", [b]);

		await questions.saveList("quiz-1", [c]);

		expect(await questions.listByQuiz("quiz-2")).toEqual([b]);
	});

	it("saveList never takes over another quiz's question", async () => {
		const questions = createDrizzleQuestionRepository(testDb.db);
		await questions.saveList("quiz-2", [a]);

		await questions.saveList("quiz-1", [{ ...a, text: "Invasor" }]);

		expect(await questions.listByQuiz("quiz-2")).toEqual([a]);
		expect(await questions.listByQuiz("quiz-1")).toEqual([]);
	});

	it("saveList rewrites positions in a single transaction", async () => {
		const questions = createDrizzleQuestionRepository(testDb.db);
		await questions.saveList("quiz-1", [a, b, c]);

		await questions.saveList("quiz-1", [c, b, a]);

		const rows = await testDb.db
			.select({ id: questionTable.id, position: questionTable.position })
			.from(questionTable)
			.where(eq(questionTable.quizId, "quiz-1"));
		expect(rows.toSorted((x, y) => x.position - y.position)).toEqual([
			{ id: "c", position: 0 },
			{ id: "b", position: 1 },
			{ id: "a", position: 2 },
		]);
	});

	it("saveQuestion updates content without changing order", async () => {
		const questions = createDrizzleQuestionRepository(testDb.db);
		await questions.saveList("quiz-1", [a, b, c]);

		await questions.saveQuestion("quiz-1", { ...b, text: "B editada" });

		expect(await questions.listByQuiz("quiz-1")).toEqual([
			a,
			{ ...b, text: "B editada" },
			c,
		]);
	});

	it("saveQuestion never touches another quiz's question", async () => {
		const questions = createDrizzleQuestionRepository(testDb.db);
		await questions.saveList("quiz-2", [a]);

		await questions.saveQuestion("quiz-1", { ...a, text: "Invasor" });

		expect(await questions.listByQuiz("quiz-2")).toEqual([a]);
	});

	it("counts a quiz's questions", async () => {
		const questions = createDrizzleQuestionRepository(testDb.db);
		await questions.saveList("quiz-1", [a, b]);

		expect(await questions.countByQuiz("quiz-1")).toBe(2);
		expect(await questions.countByQuiz("quiz-2")).toBe(0);
	});

	it("deleteAllOfQuiz removes only that quiz's questions", async () => {
		const questions = createDrizzleQuestionRepository(testDb.db);
		await questions.saveList("quiz-1", [a]);
		await questions.saveList("quiz-2", [b]);

		await questions.deleteAllOfQuiz("quiz-1");

		expect(await questions.listByQuiz("quiz-1")).toEqual([]);
		expect(await questions.listByQuiz("quiz-2")).toEqual([b]);
	});

	it("round-trips time, points and quiz content", async () => {
		const questions = createDrizzleQuestionRepository(testDb.db);
		const full = aQuestion({
			id: "full",
			timeLimitSeconds: 90,
			points: "double",
			selection: "multiple",
			choices: [
				{ id: "choice-1", text: "Brasília", correct: true },
				{ id: "choice-2", text: "Rio", correct: true },
				{ id: "choice-3", text: null, correct: false },
				{ id: "choice-4", text: null, correct: false },
				{ id: "choice-5", text: "Salvador", correct: false },
				{ id: "choice-6", text: null, correct: false },
			],
		});

		await questions.saveList("quiz-1", [full]);
		await questions.saveQuestion("quiz-1", { ...full, points: "noPoints" });

		expect(await questions.listByQuiz("quiz-1")).toEqual([
			{ ...full, points: "noPoints" },
		]);
	});

	it("reads legacy rows with defaults", async () => {
		await testDb.db
			.insert(questionTable)
			.values({ id: "old", quizId: "quiz-1", position: 0, type: "quiz", text: "?" });

		expect(
			await createDrizzleQuestionRepository(testDb.db).listByQuiz("quiz-1"),
		).toEqual([aQuestion({ id: "old", text: "?" })]);
	});
});
