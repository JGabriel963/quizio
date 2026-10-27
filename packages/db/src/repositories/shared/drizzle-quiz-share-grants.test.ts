import { trashQuiz } from "@quizio/core/quiz/domain/quiz";
import { aPublishedQuiz, aQuiz } from "@quizio/core/quiz/testing/a-quiz";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { user } from "../../schema/auth";
import { quiz as quizTable } from "../../schema/quiz";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleQuizRepository } from "../quiz/drizzle-quiz-repository";
import { createDrizzleQuizShareGrants } from "./drizzle-quiz-share-grants";

describe("DrizzleQuizShareGrants, public quizzes (spec 039, RN-33)", () => {
	let testDb: TestDatabase;

	beforeAll(async () => {
		testDb = await createTestDb();
		await testDb.db.insert(user).values([
			{ id: "ana", name: "Ana", email: "ana@quizio.test" },
			{ id: "bia", name: "Bia", email: "bia@quizio.test" },
		]);
	});

	afterAll(() => testDb.close());

	beforeEach(async () => {
		await testDb.db.delete(quizTable);
	});

	it("a public published quiz out of the trash may be used by anyone", async () => {
		await createDrizzleQuizRepository(testDb.db).save(
			aPublishedQuiz({ id: "quiz-1", ownerId: "ana", visibility: "public" }),
		);

		expect(
			await createDrizzleQuizShareGrants(testDb.db).canUse("bia", "quiz-1"),
		).toBe(true);
	});

	it("a public draft, a public trashed quiz and a private one may not", async () => {
		const quizzes = createDrizzleQuizRepository(testDb.db);
		await quizzes.save(
			aQuiz({ id: "draft", ownerId: "ana", visibility: "public" }),
		);
		await quizzes.save(
			trashQuiz(
				aPublishedQuiz({ id: "trashed", ownerId: "ana", visibility: "public" }),
				new Date("2026-10-27T12:00:00.000Z"),
			),
		);
		await quizzes.save(aPublishedQuiz({ id: "private", ownerId: "ana" }));
		const grants = createDrizzleQuizShareGrants(testDb.db);

		for (const quizId of ["draft", "trashed", "private"]) {
			expect(await grants.canUse("bia", quizId)).toBe(false);
		}
	});
});
