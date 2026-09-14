import { aQuiz } from "@quizio/core/quiz/testing/a-quiz";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { user } from "../../schema/auth";
import { quiz as quizTable } from "../../schema/quiz";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleQuizRepository } from "./drizzle-quiz-repository";

describe("DrizzleQuizRepository", () => {
	let testDb: TestDatabase;

	beforeAll(async () => {
		testDb = await createTestDb();
		await testDb.db.insert(user).values([
			{ id: "user-1", name: "Ana", email: "ana@quizio.test" },
			{ id: "user-2", name: "Beto", email: "beto@quizio.test" },
		]);
	});

	afterAll(() => testDb.close());

	beforeEach(async () => {
		await testDb.db.delete(quizTable);
	});

	it("round-trips a quiz with every field", async () => {
		const quizzes = createDrizzleQuizRepository(testDb.db);
		const quiz = aQuiz({
			coverImageKey: "media/user-1/cover.png",
			visibility: "unlisted",
			updatedAt: new Date("2026-01-05T08:30:15.123Z"),
			trashedAt: new Date("2026-02-01T10:00:00.000Z"),
		});

		await quizzes.save(quiz);

		expect(await quizzes.findById("quiz-1")).toEqual(quiz);
	});

	it("returns null for an unknown id", async () => {
		const quizzes = createDrizzleQuizRepository(testDb.db);

		expect(await quizzes.findById("missing")).toBeNull();
	});

	it("upserts on save", async () => {
		const quizzes = createDrizzleQuizRepository(testDb.db);
		await quizzes.save(aQuiz());
		const changed = aQuiz({
			title: null,
			description: null,
			updatedAt: new Date("2026-03-01T00:00:00.000Z"),
		});

		await quizzes.save(changed);

		expect(await quizzes.findById("quiz-1")).toEqual(changed);
		expect(await testDb.db.select().from(quizTable)).toHaveLength(1);
	});

	it("deletes a quiz", async () => {
		const quizzes = createDrizzleQuizRepository(testDb.db);
		await quizzes.save(aQuiz());

		await quizzes.delete("quiz-1");

		expect(await quizzes.findById("quiz-1")).toBeNull();
	});

	it("stores the normalized search title", async () => {
		const quizzes = createDrizzleQuizRepository(testDb.db);
		const searchTitleOf = async (id: string) =>
			(
				await testDb.db
					.select({ searchTitle: quizTable.searchTitle })
					.from(quizTable)
					.where(eq(quizTable.id, id))
			)[0]?.searchTitle;

		await quizzes.save(aQuiz({ id: "untitled", title: null }));
		await quizzes.save(aQuiz({ id: "accented", title: "BÍBLIA  Kids" }));

		expect(await searchTitleOf("untitled")).toBe("quiz sem titulo");
		expect(await searchTitleOf("accented")).toBe("biblia kids");
	});

	it("removes quizzes when their owner is removed", async () => {
		const quizzes = createDrizzleQuizRepository(testDb.db);
		await testDb.db
			.insert(user)
			.values({ id: "user-3", name: "Caio", email: "caio@quizio.test" });
		await quizzes.save(aQuiz({ ownerId: "user-3" }));

		await testDb.db.delete(user).where(eq(user.id, "user-3"));

		expect(await quizzes.findById("quiz-1")).toBeNull();
	});
});
