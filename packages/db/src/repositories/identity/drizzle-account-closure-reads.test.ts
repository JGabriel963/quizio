import { aGame } from "@quizio/core/game/testing/a-game";
import { adminOf, aGroup } from "@quizio/core/groups/testing/a-group";
import { trashQuiz } from "@quizio/core/quiz/domain/quiz";
import { aQuiz } from "@quizio/core/quiz/testing/a-quiz";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { user } from "../../schema/auth";
import { groupMember, groupPost, groupUpload } from "../../schema/groups";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleGameRepository } from "../game/drizzle-game-repository";
import { createDrizzleGroupPostRepository } from "../groups/drizzle-group-post-repository";
import { createDrizzleGroupRepository } from "../groups/drizzle-group-repository";
import { createDrizzleGroupUploadRepository } from "../groups/drizzle-group-upload-repository";
import { createDrizzleQuizRepository } from "../quiz/drizzle-quiz-repository";

const at = new Date("2026-10-27T12:00:00.000Z");

/** What deleting an account reads before the rows cascade (spec 039, RN-39). */
describe("reads for deleting an account (spec 039)", () => {
	let testDb: TestDatabase;

	beforeAll(async () => {
		testDb = await createTestDb();
		await testDb.db.insert(user).values([
			{ id: "ana", name: "Ana", email: "ana@quizio.test" },
			{ id: "bruno", name: "Bruno", email: "bruno@quizio.test" },
		]);
	});

	afterAll(() => testDb.close());

	it("listIdsByOwner lists the owner's quizzes, trashed ones too", async () => {
		const quizzes = createDrizzleQuizRepository(testDb.db);
		await quizzes.save(aQuiz({ id: "q-ana", ownerId: "ana" }));
		await quizzes.save(
			trashQuiz(aQuiz({ id: "q-ana-trash", ownerId: "ana" }), at),
		);
		await quizzes.save(aQuiz({ id: "q-bruno", ownerId: "bruno" }));

		expect((await quizzes.listIdsByOwner("ana")).sort()).toEqual([
			"q-ana",
			"q-ana-trash",
		]);
	});

	it("listUnendedByOwner lists the open games a user hosts", async () => {
		const games = createDrizzleGameRepository(testDb.db);
		await games.create(
			aGame({ id: "open", ownerId: "ana", quizId: "q-bruno", pin: "111111" }),
		);
		await games.create(
			aGame({
				id: "ended",
				ownerId: "ana",
				quizId: "q-x",
				pin: "222222",
				endedAt: at,
				endReason: "host",
			}),
		);
		await games.create(
			aGame({ id: "other", ownerId: "bruno", quizId: "q-y", pin: "333333" }),
		);

		expect(
			(await games.listUnendedByOwner("ana")).map((game) => game.id),
		).toEqual(["open"]);
	});

	it("fileKeysByAuthor and uploadKeysOfUser find what the user left in groups", async () => {
		const group = aGroup({ id: "g-bruno", adminId: "bruno", inviteCode: "c" });
		await createDrizzleGroupRepository(testDb.db).create(group, adminOf(group));
		await testDb.db.insert(groupMember).values({
			groupId: "g-bruno",
			userId: "ana",
			role: "member",
			joinedAt: at,
		});
		await testDb.db.insert(groupPost).values([
			{
				id: "p1",
				groupId: "g-bruno",
				authorId: "ana",
				kind: "message",
				fileType: "pdf",
				fileKey: "groups/g-bruno/a.pdf",
				fileName: "a.pdf",
				fileSizeBytes: 10,
				createdAt: at,
			},
			{
				id: "p2",
				groupId: "g-bruno",
				authorId: "ana",
				kind: "message",
				message: "Só texto",
				createdAt: at,
			},
			{
				id: "p3",
				groupId: "g-bruno",
				authorId: "bruno",
				kind: "message",
				fileType: "pdf",
				fileKey: "groups/g-bruno/b.pdf",
				fileName: "b.pdf",
				fileSizeBytes: 10,
				createdAt: at,
			},
		]);
		await testDb.db.insert(groupUpload).values([
			{
				key: "groups/g-bruno/pending.png",
				groupId: "g-bruno",
				uploaderId: "ana",
				fileType: "image",
				fileName: "pending.png",
				fileSizeBytes: 10,
				createdAt: at,
			},
		]);

		expect(
			await createDrizzleGroupPostRepository(testDb.db).fileKeysByAuthor("ana"),
		).toEqual(["groups/g-bruno/a.pdf"]);
		expect(
			await createDrizzleGroupUploadRepository(testDb.db).uploadKeysOfUser(
				"ana",
			),
		).toEqual(["groups/g-bruno/pending.png"]);
	});
});
