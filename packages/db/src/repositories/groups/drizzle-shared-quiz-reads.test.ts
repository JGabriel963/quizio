import { aGame, aPlayer, aPlayingGame } from "@quizio/core/game/testing/a-game";
import type { SharedQuiz } from "@quizio/core/groups/domain/shared-quiz";
import { adminOf, aGroup } from "@quizio/core/groups/testing/a-group";
import { trashQuiz } from "@quizio/core/quiz/domain/quiz";
import { newQuizVersion } from "@quizio/core/quiz/domain/quiz-version";
import { aQuestion } from "@quizio/core/quiz/testing/a-question";
import { aPublishedQuiz, aQuiz } from "@quizio/core/quiz/testing/a-quiz";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { user } from "../../schema/auth";
import { game as gameTable } from "../../schema/game";
import { groupTable } from "../../schema/groups";
import { quiz as quizTable } from "../../schema/quiz";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleGameRepository } from "../game/drizzle-game-repository";
import { createDrizzlePlayerRepository } from "../game/drizzle-player-repository";
import { createDrizzleQuizRepository } from "../quiz/drizzle-quiz-repository";
import { createDrizzleQuizVersionRepository } from "../quiz/drizzle-quiz-version-repository";
import { createDrizzleGroupRepository } from "./drizzle-group-repository";
import { createDrizzleGroupSharedQuizRepository } from "./drizzle-group-shared-quiz-repository";
import { createDrizzleSharedQuizReads } from "./drizzle-shared-quiz-reads";

const at = (minute: number) =>
	new Date(`2026-10-26T12:${String(minute).padStart(2, "0")}:00.000Z`);

describe("DrizzleSharedQuizReads (spec 037)", () => {
	let testDb: TestDatabase;
	let quizzes: ReturnType<typeof createDrizzleQuizRepository>;
	let versions: ReturnType<typeof createDrizzleQuizVersionRepository>;
	let shares: ReturnType<typeof createDrizzleGroupSharedQuizRepository>;
	let reads: ReturnType<typeof createDrizzleSharedQuizReads>;

	async function publish(id: string, title: string, questions = 2) {
		await quizzes.save(
			aPublishedQuiz({
				id,
				ownerId: "ana",
				title,
				description: `Sobre ${title}`,
				coverImageKey: `media/ana/${id}.png`,
				visibility: "public",
			}),
		);
		await versions.save(
			newQuizVersion({
				quizId: id,
				number: 1,
				questions: Array.from({ length: questions }, (_, index) =>
					aQuestion({ id: `${id}-q${index}`, text: `Pergunta ${index}` }),
				),
				now: at(0),
			}),
		);
	}

	async function share(quizId: string, minute: number) {
		const shared: SharedQuiz = {
			id: `share-${quizId}`,
			groupId: "g1",
			quizId,
			sharedById: "ana",
			sharedAt: at(minute),
		};
		await shares.shareWithPost([shared], {
			id: `post-${quizId}`,
			groupId: "g1",
			authorId: "ana",
			kind: "quizShare",
			message: null,
			gameId: null,
			file: null,
			sharedQuizId: shared.id,
			createdAt: at(minute),
		});
	}

	beforeAll(async () => {
		testDb = await createTestDb();
		await testDb.db.insert(user).values([
			{ id: "ana", name: "Ana Souza", email: "ana@quizio.test" },
			{ id: "bruno", name: "Bruno", email: "bruno@quizio.test" },
		]);
		quizzes = createDrizzleQuizRepository(testDb.db);
		versions = createDrizzleQuizVersionRepository(testDb.db);
		shares = createDrizzleGroupSharedQuizRepository(testDb.db);
		reads = createDrizzleSharedQuizReads(testDb.db);
	});

	afterAll(() => testDb.close());

	beforeEach(async () => {
		await testDb.db.delete(groupTable);
		await testDb.db.delete(gameTable);
		await testDb.db.delete(quizTable);
		const group = aGroup({ id: "g1", adminId: "ana", inviteCode: "code-g1" });
		await createDrizzleGroupRepository(testDb.db).create(group, adminOf(group));
	});

	it("shareable keeps the owner's published quizzes out of the trash", async () => {
		await publish("capitais", "Capitais");
		await quizzes.save(aQuiz({ id: "rascunho", ownerId: "ana" }));
		await publish("velho", "Velho");
		await quizzes.save(
			trashQuiz(aPublishedQuiz({ id: "velho", ownerId: "ana" }), at(1)),
		);

		expect(
			await reads.shareableQuizIds("ana", [
				"capitais",
				"rascunho",
				"velho",
				"nenhum",
			]),
		).toEqual(["capitais"]);
		expect(await reads.shareableQuizIds("bruno", ["capitais"])).toEqual([]);
		expect(await reads.shareableQuizIds("ana", [])).toEqual([]);
	});

	it("list hides trashed quizzes and sorts by sharedAt and by name with accents", async () => {
		await publish("biblia", "Bíblia");
		await publish("algebra", "Álgebra");
		await publish("capitais", "Capitais");
		await share("biblia", 1);
		await share("algebra", 2);
		await share("capitais", 3);
		const titles = async (sort: "recent" | "oldest" | "nameAsc" | "nameDesc") =>
			(await reads.listSharedQuizzes("g1", sort, 20)).map((card) => card.title);

		expect(await titles("recent")).toEqual(["Capitais", "Álgebra", "Bíblia"]);
		expect(await titles("oldest")).toEqual(["Bíblia", "Álgebra", "Capitais"]);
		expect(await titles("nameAsc")).toEqual(["Álgebra", "Bíblia", "Capitais"]);
		expect(await titles("nameDesc")).toEqual(["Capitais", "Bíblia", "Álgebra"]);
		expect(await reads.listSharedQuizzes("g1", "recent", 2)).toHaveLength(2);

		await quizzes.save(
			trashQuiz(
				aPublishedQuiz({ id: "capitais", ownerId: "ana", title: "Capitais" }),
				at(5),
			),
		);
		expect(await titles("recent")).toEqual(["Álgebra", "Bíblia"]);
	});

	it("each card has the version's question count, owner, visibility and sharedAt", async () => {
		await publish("capitais", "Capitais", 3);
		await share("capitais", 4);

		expect(await reads.sharedQuizCards(["share-capitais", "nenhum"])).toEqual([
			{
				sharedQuizId: "share-capitais",
				quizId: "capitais",
				title: "Capitais",
				coverImageKey: "media/ana/capitais.png",
				questionCount: 3,
				visibility: "public",
				ownerId: "ana",
				ownerName: "Ana Souza",
				sharedById: "ana",
				sharedAt: at(4),
				games: 0,
			},
		]);
		expect(await reads.sharedQuizCards([])).toEqual([]);
	});

	it("games counts started live games and assignments of any host; participants counts their players", async () => {
		await publish("capitais", "Capitais");
		await share("capitais", 1);
		const games = createDrizzleGameRepository(testDb.db);
		const players = createDrizzlePlayerRepository(testDb.db);
		await games.create(
			aPlayingGame(
				"answering",
				{},
				{
					id: "played",
					quizId: "capitais",
					ownerId: "ana",
					pin: "111111",
				},
			),
		);
		await games.create(
			aGame({
				id: "lobby",
				quizId: "capitais",
				ownerId: "bruno",
				pin: "222222",
			}),
		);
		await players.add(aPlayer({ id: "p1", gameId: "played", nickname: "Lia" }));
		await players.add(aPlayer({ id: "p2", gameId: "played", nickname: "Rui" }));
		await players.add(aPlayer({ id: "p3", gameId: "lobby", nickname: "Ivo" }));

		const [card] = await reads.listSharedQuizzes("g1", "recent", 20);
		const detail = await reads.sharedQuizDetail("g1", "capitais");

		expect(card?.games).toBe(1);
		expect(detail).toMatchObject({ games: 1, participants: 2 });
	});

	it("detail returns the version's questions, the description and who shared", async () => {
		await publish("capitais", "Capitais", 2);
		await share("capitais", 1);

		const detail = await reads.sharedQuizDetail("g1", "capitais");

		expect(detail).toMatchObject({
			quizId: "capitais",
			description: "Sobre Capitais",
			sharedByName: "Ana Souza",
			participants: 0,
		});
		expect(detail?.questions.map((question) => question.text)).toEqual([
			"Pergunta 0",
			"Pergunta 1",
		]);
		expect(await reads.sharedQuizDetail("g1", "rios")).toBeNull();
	});
});
