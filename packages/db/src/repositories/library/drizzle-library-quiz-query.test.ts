import type { LibraryQuizRecord } from "@quizio/core/library/application/ports/library-quiz-query";
import type { Quiz } from "@quizio/core/quiz/domain/quiz";
import { aQuiz } from "@quizio/core/quiz/testing/a-quiz";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { user } from "../../schema/auth";
import { quiz as quizTable } from "../../schema/quiz";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleQuizRepository } from "../quiz/drizzle-quiz-repository";
import { createDrizzleLibraryQuizQuery } from "./drizzle-library-quiz-query";

const day = (n: number) =>
	new Date(`2026-01-${String(n).padStart(2, "0")}T10:00:00.000Z`);

const ids = (records: LibraryQuizRecord[]) =>
	records.map((record) => record.id);

describe("DrizzleLibraryQuizQuery", () => {
	let testDb: TestDatabase;

	const seed = async (...quizzes: Quiz[]) => {
		const repository = createDrizzleQuizRepository(testDb.db);
		for (const quiz of quizzes) {
			await repository.save(quiz);
		}
	};

	const list = (
		section: "recent" | "drafts" | "trash",
		searchText: string | null = null,
		ownerId = "user-1",
	) =>
		createDrizzleLibraryQuizQuery(testDb.db).list({
			ownerId,
			section,
			searchText,
		});

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

	it("filters by owner", async () => {
		await seed(
			aQuiz({ id: "mine" }),
			aQuiz({ id: "theirs", ownerId: "user-2" }),
		);

		expect(ids(await list("recent"))).toEqual(["mine"]);
		expect(ids(await list("recent", null, "user-2"))).toEqual(["theirs"]);
	});

	it("splits recent, drafts and trash", async () => {
		await seed(
			aQuiz({ id: "active" }),
			aQuiz({ id: "trashed", trashedAt: day(2) }),
		);

		expect(ids(await list("recent"))).toEqual(["active"]);
		expect(ids(await list("drafts"))).toEqual(["active"]);
		expect(ids(await list("trash"))).toEqual(["trashed"]);
	});

	it("orders by updatedAt desc and the trash by trashedAt desc", async () => {
		await seed(
			aQuiz({ id: "older", updatedAt: day(1) }),
			aQuiz({ id: "newer", updatedAt: day(3) }),
			aQuiz({ id: "tie-b", updatedAt: day(2) }),
			aQuiz({ id: "tie-a", updatedAt: day(2) }),
			aQuiz({ id: "trashed-first", updatedAt: day(9), trashedAt: day(4) }),
			aQuiz({ id: "trashed-last", updatedAt: day(1), trashedAt: day(8) }),
		);

		expect(ids(await list("recent"))).toEqual([
			"newer",
			"tie-a",
			"tie-b",
			"older",
		]);
		expect(ids(await list("trash"))).toEqual(["trashed-last", "trashed-first"]);
	});

	it("matches 'biblia' against 'Bom de Bíblia (Junho)' and 'BÍBLIA KIDS'", async () => {
		await seed(
			aQuiz({ id: "junho", title: "Bom de Bíblia (Junho)", updatedAt: day(3) }),
			aQuiz({ id: "kids", title: "BÍBLIA KIDS", updatedAt: day(2) }),
			aQuiz({ id: "geo", title: "Geografia", updatedAt: day(1) }),
		);

		expect(ids(await list("recent", "biblia"))).toEqual(["junho", "kids"]);
		expect(await list("recent", "historia")).toEqual([]);
	});

	it("finds untitled quizzes by their display title", async () => {
		await seed(aQuiz({ id: "untitled", title: null }));

		expect(ids(await list("recent", "quiz sem titulo"))).toEqual(["untitled"]);
	});

	it("treats %, _ and backslash in the search literally", async () => {
		await seed(
			aQuiz({ id: "percent", title: "100% certo" }),
			aQuiz({ id: "digits", title: "1000 certo" }),
			aQuiz({ id: "underscore", title: "a_b" }),
			aQuiz({ id: "letter", title: "axb" }),
			aQuiz({ id: "backslash", title: "c\\d" }),
		);

		expect(ids(await list("recent", "100%"))).toEqual(["percent"]);
		expect(ids(await list("recent", "a_b"))).toEqual(["underscore"]);
		expect(ids(await list("recent", "c\\d"))).toEqual(["backslash"]);
	});

	it("returns nothing for an empty trash", async () => {
		await seed(aQuiz());

		expect(await list("trash")).toEqual([]);
	});

	it("maps rows to library records", async () => {
		await seed(
			aQuiz({
				coverImageKey: "media/user-1/cover.png",
				visibility: "unlisted",
			}),
		);

		expect(await list("recent")).toEqual([
			{
				id: "quiz-1",
				ownerId: "user-1",
				title: "Bom de Bíblia (Junho)",
				searchTitle: "bom de biblia (junho)",
				coverImageKey: "media/user-1/cover.png",
				visibility: "unlisted",
				status: "draft",
				questionCount: 0,
				updatedAt: aQuiz().updatedAt,
				trashedAt: null,
			},
		]);
	});
});
