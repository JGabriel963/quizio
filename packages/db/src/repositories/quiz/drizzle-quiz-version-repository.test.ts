import { newQuizVersion } from "@quizio/core/quiz/domain/quiz-version";
import {
	aFormattedAnswersQuestion,
	anImageAnswersQuestion,
	aQuestion,
	aTrueFalseQuestion,
} from "@quizio/core/quiz/testing/a-question";
import { aQuiz } from "@quizio/core/quiz/testing/a-quiz";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { user } from "../../schema/auth";
import {
	quiz as quizTable,
	quizVersion as versionTable,
} from "../../schema/quiz";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleQuizRepository } from "./drizzle-quiz-repository";
import { createDrizzleQuizVersionRepository } from "./drizzle-quiz-version-repository";

const quizQuestion = aQuestion({
	id: "a",
	selection: "multiple",
	timeLimitSeconds: 45,
	points: "double",
	choices: [
		{
			id: "choice-1",
			text: "Brasília",
			textFormatting: {},
			image: null,
			correct: true,
		},
		{
			id: "choice-2",
			text: "Rio",
			textFormatting: {},
			image: null,
			correct: false,
		},
		{
			id: "choice-3",
			text: null,
			textFormatting: {},
			image: null,
			correct: false,
		},
		{
			id: "choice-4",
			text: null,
			textFormatting: {},
			image: null,
			correct: false,
		},
		{
			id: "choice-5",
			text: "Salvador",
			textFormatting: {},
			image: null,
			correct: true,
		},
		{
			id: "choice-6",
			text: null,
			textFormatting: {},
			image: null,
			correct: false,
		},
	],
});
const trueFalse = aTrueFalseQuestion({
	id: "b",
	correct: false,
	timeLimitSeconds: 10,
	points: "noPoints",
});
const createdAt = new Date("2026-02-01T10:00:00.123Z");

const versionOf = (
	quizId: string,
	number: number,
	questions = [quizQuestion, trueFalse],
) => newQuizVersion({ quizId, number, questions, now: createdAt });

describe("DrizzleQuizVersionRepository", () => {
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

	it("stores and reads a version with both question types", async () => {
		const versions = createDrizzleQuizVersionRepository(testDb.db);

		await versions.save(versionOf("quiz-1", 1));

		expect(await versions.find("quiz-1", 1)).toEqual({
			quizId: "quiz-1",
			number: 1,
			questions: [quizQuestion, trueFalse],
			createdAt,
		});
	});

	it("finds by quiz and number", async () => {
		const versions = createDrizzleQuizVersionRepository(testDb.db);
		await versions.save(versionOf("quiz-1", 1));
		await versions.save(versionOf("quiz-1", 2, [trueFalse]));
		await versions.save(versionOf("quiz-2", 1, [quizQuestion]));

		expect((await versions.find("quiz-1", 2))?.questions).toEqual([trueFalse]);
		expect((await versions.find("quiz-2", 1))?.questions).toEqual([
			quizQuestion,
		]);
		expect(await versions.find("quiz-1", 3)).toBeNull();
		expect(await versions.find("missing", 1)).toBeNull();
	});

	it("lists the versions of a quiz, oldest first", async () => {
		const versions = createDrizzleQuizVersionRepository(testDb.db);
		await versions.save(versionOf("quiz-1", 2, [trueFalse]));
		await versions.save(versionOf("quiz-1", 1));
		await versions.save(versionOf("quiz-2", 1));

		const listed = await versions.listByQuiz("quiz-1");

		expect(listed.map(({ number }) => number)).toEqual([1, 2]);
		expect(listed[1]?.questions).toEqual([trueFalse]);
		expect(await versions.listByQuiz("missing")).toEqual([]);
	});

	it("keeps the question images in the snapshot", async () => {
		const versions = createDrizzleQuizVersionRepository(testDb.db);
		const image = {
			key: "media/user-1/ponte.png",
			placement: "media" as const,
			crop: { shape: "square" as const, zoom: 1, x: 0.5, y: 0.5 },
			altText: null,
		};

		await versions.save(versionOf("quiz-1", 1, [{ ...trueFalse, image }]));

		expect((await versions.find("quiz-1", 1))?.questions[0]?.image).toEqual(
			image,
		);
	});

	it("replaces a version of the same number", async () => {
		const versions = createDrizzleQuizVersionRepository(testDb.db);
		await versions.save(versionOf("quiz-1", 1));

		await versions.save(versionOf("quiz-1", 1, [trueFalse]));

		expect((await versions.find("quiz-1", 1))?.questions).toEqual([trueFalse]);
		expect(await testDb.db.select().from(versionTable)).toHaveLength(1);
	});

	it("reads a malformed snapshot tolerantly", async () => {
		const versions = createDrizzleQuizVersionRepository(testDb.db);
		await testDb.db.insert(versionTable).values({
			quizId: "quiz-1",
			number: 1,
			questions: [{ id: "x", type: "poll" }, "junk"],
			createdAt,
		});

		expect((await versions.find("quiz-1", 1))?.questions).toEqual([]);
	});

	it("a version keeps the AI mark", async () => {
		const versions = createDrizzleQuizVersionRepository(testDb.db);
		await versions.save(
			versionOf("quiz-1", 1, [{ ...quizQuestion, aiGenerated: true }]),
		);

		expect((await versions.find("quiz-1", 1))?.questions[0]?.aiGenerated).toBe(
			true,
		);
	});

	it("a saved version keeps the formatting (spec 047)", async () => {
		const versions = createDrizzleQuizVersionRepository(testDb.db);
		await versions.save(
			versionOf("quiz-1", 1, [
				{ ...trueFalse, text: "H2O", textFormatting: { subscript: [[1, 2]] } },
			]),
		);

		expect(
			(await versions.find("quiz-1", 1))?.questions[0]?.textFormatting,
		).toEqual({ subscript: [[1, 2]] });
	});

	it("versions carry the answers' formatting (spec 048)", async () => {
		const versions = createDrizzleQuizVersionRepository(testDb.db);
		const formatted = aFormattedAnswersQuestion({ id: "a" });
		await versions.save(versionOf("quiz-1", 1, [formatted]));

		expect((await versions.find("quiz-1", 1))?.questions).toEqual([formatted]);
	});

	it("versions carry the answer images (spec 049)", async () => {
		const versions = createDrizzleQuizVersionRepository(testDb.db);
		const pictured = anImageAnswersQuestion({ id: "a" });
		await versions.save(versionOf("quiz-1", 1, [pictured]));

		expect((await versions.find("quiz-1", 1))?.questions).toEqual([pictured]);
	});

	it("deletes every version of a quiz", async () => {
		const versions = createDrizzleQuizVersionRepository(testDb.db);
		await versions.save(versionOf("quiz-1", 1));
		await versions.save(versionOf("quiz-1", 2));
		await versions.save(versionOf("quiz-2", 1));

		await versions.deleteAllOfQuiz("quiz-1");

		expect(await versions.find("quiz-1", 1)).toBeNull();
		expect(await versions.find("quiz-1", 2)).toBeNull();
		expect(await versions.find("quiz-2", 1)).not.toBeNull();
	});

	it("deletes the versions with the quiz", async () => {
		const versions = createDrizzleQuizVersionRepository(testDb.db);
		await versions.save(versionOf("quiz-1", 1));
		await versions.save(versionOf("quiz-2", 1));

		await testDb.db.delete(quizTable).where(eq(quizTable.id, "quiz-1"));

		const remaining = await testDb.db.select().from(versionTable);
		expect(remaining.map(({ quizId }) => quizId)).toEqual(["quiz-2"]);
	});
});
