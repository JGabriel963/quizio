import { aGame, aPlayer, aPlayingGame } from "@quizio/core/game/testing/a-game";
import { trashQuiz } from "@quizio/core/quiz/domain/quiz";
import { newQuizVersion } from "@quizio/core/quiz/domain/quiz-version";
import { aQuestion } from "@quizio/core/quiz/testing/a-question";
import { aPublishedQuiz, aQuiz } from "@quizio/core/quiz/testing/a-quiz";
import { A_THEME_LOOK } from "@quizio/core/shared/testing/a-theme-look";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { user } from "../../schema/auth";
import { game as gameTable } from "../../schema/game";
import { quiz as quizTable } from "../../schema/quiz";
import { customTheme } from "../../schema/themes";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleGameRepository } from "../game/drizzle-game-repository";
import { createDrizzlePlayerRepository } from "../game/drizzle-player-repository";
import { createDrizzleProfilePhotoRepository } from "../identity/drizzle-profile-photo-repository";
import { createDrizzleQuizRepository } from "../quiz/drizzle-quiz-repository";
import { createDrizzleQuizVersionRepository } from "../quiz/drizzle-quiz-version-repository";
import { createDrizzleCreatorProfileQuery } from "./drizzle-creator-profile-query";

const day = (n: number) =>
	new Date(`2026-10-${String(n).padStart(2, "0")}T12:00:00.000Z`);

describe("DrizzleCreatorProfileQuery (spec 039)", () => {
	let testDb: TestDatabase;
	let quizzes: ReturnType<typeof createDrizzleQuizRepository>;
	let versions: ReturnType<typeof createDrizzleQuizVersionRepository>;

	async function publish(
		id: string,
		overrides: Parameters<typeof aPublishedQuiz>[0] = {},
	) {
		await quizzes.save(
			aPublishedQuiz({
				id,
				ownerId: "ana",
				title: `Quiz ${id}`,
				visibility: "public",
				...overrides,
			}),
		);
		await versions.save(
			newQuizVersion({
				quizId: id,
				number: 1,
				questions: [
					aQuestion({ id: `${id}-q1` }),
					aQuestion({ id: `${id}-q2` }),
				],
				now: day(1),
			}),
		);
	}

	beforeAll(async () => {
		testDb = await createTestDb();
		await testDb.db.insert(user).values([
			{ id: "ana", name: "Ana", email: "ana@quizio.test" },
			{ id: "bia", name: "Bia", email: "bia@quizio.test" },
		]);
		quizzes = createDrizzleQuizRepository(testDb.db);
		versions = createDrizzleQuizVersionRepository(testDb.db);
	});

	afterAll(() => testDb.close());

	beforeEach(async () => {
		await testDb.db.delete(gameTable);
		await testDb.db.delete(quizTable);
	});

	it("creator reads the name and the photo key", async () => {
		await createDrizzleProfilePhotoRepository(testDb.db).save(
			"ana",
			"profiles/ana/a.webp",
		);
		const profiles = createDrizzleCreatorProfileQuery(testDb.db);

		expect(await profiles.creator("ana")).toEqual({
			userId: "ana",
			name: "Ana",
			photoKey: "profiles/ana/a.webp",
		});
		expect(await profiles.creator("bia")).toEqual({
			userId: "bia",
			name: "Bia",
			photoKey: null,
		});
		expect(await profiles.creator("nobody")).toBeNull();
	});

	it("lists only published public quizzes out of the trash, newest first", async () => {
		await publish("old", { publishedAt: day(2) });
		await publish("new", { publishedAt: day(5) });
		await publish("private", { visibility: "private" });
		await publish("trashed", { publishedAt: day(3) });
		await quizzes.save(
			trashQuiz(
				aPublishedQuiz({ id: "trashed", ownerId: "ana", visibility: "public" }),
				day(6),
			),
		);
		await quizzes.save(
			aQuiz({ id: "draft", ownerId: "ana", visibility: "public" }),
		);
		await publish("bias", { ownerId: "bia" });

		const cards = await createDrizzleCreatorProfileQuery(
			testDb.db,
		).publicQuizzes("ana");

		expect(cards).toEqual([
			{
				quizId: "new",
				title: "Quiz new",
				coverImageKey: null,
				questionCount: 2,
				games: 0,
				participants: 0,
			},
			expect.objectContaining({ quizId: "old" }),
		]);
	});

	it("counts started games of any host and their players", async () => {
		await publish("capitais");
		const games = createDrizzleGameRepository(testDb.db);
		const players = createDrizzlePlayerRepository(testDb.db);
		await games.create(
			aPlayingGame(
				"answering",
				{},
				{ id: "played", quizId: "capitais", ownerId: "bia", pin: "111111" },
			),
		);
		await games.create(
			aGame({ id: "lobby", quizId: "capitais", ownerId: "ana", pin: "222222" }),
		);
		await players.add(aPlayer({ id: "p1", gameId: "played", nickname: "Lia" }));
		await players.add(aPlayer({ id: "p2", gameId: "played", nickname: "Rui" }));
		await players.add(aPlayer({ id: "p3", gameId: "lobby", nickname: "Ivo" }));

		const [card] = await createDrizzleCreatorProfileQuery(
			testDb.db,
		).publicQuizzes("ana");

		expect(card).toMatchObject({ games: 1, participants: 2 });
	});

	it("publicQuiz returns the playable version's questions, null otherwise", async () => {
		await publish("capitais", { description: "Atos 1 a 7" });
		await publish("private", { visibility: "private" });
		const profiles = createDrizzleCreatorProfileQuery(testDb.db);

		expect(await profiles.publicQuiz("ana", "capitais")).toMatchObject({
			quizId: "capitais",
			description: "Atos 1 a 7",
			questionCount: 2,
			questions: [
				expect.objectContaining({ id: "capitais-q1" }),
				expect.objectContaining({ id: "capitais-q2" }),
			],
		});
		expect(await profiles.publicQuiz("ana", "private")).toBeNull();
		expect(await profiles.publicQuiz("bia", "capitais")).toBeNull();
	});

	it("publicQuiz returns the owner's custom look (spec 043, RN-22)", async () => {
		await testDb.db.insert(customTheme).values({
			id: "theme-1",
			ownerId: "ana",
			name: "Escola Azul",
			look: A_THEME_LOOK,
			createdAt: new Date("2026-10-28T12:00:00.000Z"),
			updatedAt: new Date("2026-10-28T12:00:00.000Z"),
		});
		await publish("capitais", { customThemeId: "theme-1" });
		const profiles = createDrizzleCreatorProfileQuery(testDb.db);

		expect((await profiles.publicQuiz("ana", "capitais"))?.customTheme).toEqual(
			A_THEME_LOOK,
		);
	});

	it("publicQuiz returns the quiz's theme (spec 042)", async () => {
		await publish("capitais", { themeId: "teal" });
		const profiles = createDrizzleCreatorProfileQuery(testDb.db);

		expect((await profiles.publicQuiz("ana", "capitais"))?.themeId).toBe(
			"teal",
		);
	});
});
