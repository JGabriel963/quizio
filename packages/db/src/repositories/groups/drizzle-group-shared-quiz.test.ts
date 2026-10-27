import type { GroupPost } from "@quizio/core/groups/domain/group-post";
import type { SharedQuiz } from "@quizio/core/groups/domain/shared-quiz";
import { adminOf, aGroup } from "@quizio/core/groups/testing/a-group";
import { trashQuiz } from "@quizio/core/quiz/domain/quiz";
import { newQuizVersion } from "@quizio/core/quiz/domain/quiz-version";
import { aQuestion } from "@quizio/core/quiz/testing/a-question";
import { aPublishedQuiz } from "@quizio/core/quiz/testing/a-quiz";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { user } from "../../schema/auth";
import { groupMember, groupPost, groupTable } from "../../schema/groups";
import { quiz as quizTable } from "../../schema/quiz";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleQuizRepository } from "../quiz/drizzle-quiz-repository";
import { createDrizzleQuizVersionRepository } from "../quiz/drizzle-quiz-version-repository";
import { createDrizzleQuizShareGrants } from "../shared/drizzle-quiz-share-grants";
import { createDrizzleGroupFeedQuery } from "./drizzle-group-feed-query";
import { createDrizzleGroupMemberRepository } from "./drizzle-group-member-repository";
import { createDrizzleGroupPostRepository } from "./drizzle-group-post-repository";
import { createDrizzleGroupRepository } from "./drizzle-group-repository";
import { createDrizzleGroupSharedQuizRepository } from "./drizzle-group-shared-quiz-repository";

const at = (minute: number) =>
	new Date(`2026-10-26T12:${String(minute).padStart(2, "0")}:00.000Z`);

function aShare(overrides: Partial<SharedQuiz> = {}): SharedQuiz {
	return {
		id: "share-1",
		groupId: "g1",
		quizId: "quiz-1",
		sharedById: "bruno",
		sharedAt: at(1),
		...overrides,
	};
}

function aSharePost(overrides: Partial<GroupPost> = {}): GroupPost {
	return {
		id: "post-1",
		groupId: "g1",
		authorId: "bruno",
		kind: "quizShare",
		message: null,
		gameId: null,
		file: null,
		sharedQuizId: "share-1",
		createdAt: at(1),
		...overrides,
	};
}

describe("Drizzle shared quizzes (spec 037; ADR 0018)", () => {
	let testDb: TestDatabase;
	let groups: ReturnType<typeof createDrizzleGroupRepository>;
	let members: ReturnType<typeof createDrizzleGroupMemberRepository>;
	let shares: ReturnType<typeof createDrizzleGroupSharedQuizRepository>;
	let posts: ReturnType<typeof createDrizzleGroupPostRepository>;
	let feed: ReturnType<typeof createDrizzleGroupFeedQuery>;
	let quizzes: ReturnType<typeof createDrizzleQuizRepository>;
	let grants: ReturnType<typeof createDrizzleQuizShareGrants>;

	beforeAll(async () => {
		testDb = await createTestDb();
		await testDb.db.insert(user).values([
			{ id: "ana", name: "Ana", email: "ana@quizio.test" },
			{ id: "bruno", name: "Bruno", email: "bruno@quizio.test" },
			{ id: "carla", name: "Carla", email: "carla@quizio.test" },
		]);
		groups = createDrizzleGroupRepository(testDb.db);
		members = createDrizzleGroupMemberRepository(testDb.db);
		shares = createDrizzleGroupSharedQuizRepository(testDb.db);
		posts = createDrizzleGroupPostRepository(testDb.db);
		feed = createDrizzleGroupFeedQuery(testDb.db);
		quizzes = createDrizzleQuizRepository(testDb.db);
		grants = createDrizzleQuizShareGrants(testDb.db);
	});

	afterAll(() => testDb.close());

	beforeEach(async () => {
		await testDb.db.delete(groupTable);
		await testDb.db.delete(quizTable);
		for (const id of ["g1", "g2"]) {
			const group = aGroup({ id, adminId: "ana", inviteCode: `code-${id}` });
			await groups.create(group, adminOf(group));
		}
		await testDb.db.insert(groupMember).values([
			{ groupId: "g1", userId: "bruno", role: "member", joinedAt: at(0) },
			{ groupId: "g1", userId: "carla", role: "member", joinedAt: at(0) },
		]);
		for (const id of ["quiz-1", "quiz-2"]) {
			await quizzes.save(aPublishedQuiz({ id, ownerId: "bruno" }));
		}
		await createDrizzleQuizVersionRepository(testDb.db).save(
			newQuizVersion({
				quizId: "quiz-1",
				number: 1,
				questions: [aQuestion()],
				now: at(0),
			}),
		);
	});

	it("shareWithPost inserts rows and post in one transaction; alreadyShared writes nothing", async () => {
		expect(await shares.shareWithPost([aShare()], aSharePost())).toBe(
			"created",
		);
		expect(await shares.findSharedQuiz("g1", "quiz-1")).toEqual(aShare());
		expect(await posts.findPost("g1", "post-1")).toEqual(aSharePost());

		const again = await shares.shareWithPost(
			[
				aShare({ id: "share-2", quizId: "quiz-2" }),
				aShare({ id: "share-3", quizId: "quiz-1" }),
			],
			aSharePost({ id: "post-2", kind: "quizzesShare", sharedQuizId: null }),
		);

		expect(again).toBe("alreadyShared");
		expect(await shares.sharedQuizIdsOf("g1")).toEqual(["quiz-1"]);
		expect(await posts.findPost("g1", "post-2")).toBeNull();
	});

	it("one share per group and quiz; the same quiz may go to another group", async () => {
		await shares.shareWithPost([aShare()], aSharePost());
		await testDb.db.insert(groupMember).values({
			groupId: "g2",
			userId: "bruno",
			role: "member",
			joinedAt: at(0),
		});

		expect(
			await shares.shareWithPost(
				[aShare({ id: "share-2", groupId: "g2" })],
				aSharePost({ id: "post-2", groupId: "g2", sharedQuizId: "share-2" }),
			),
		).toBe("created");
	});

	it("findSharedQuiz, removeSharedQuiz, sharedQuizIdsOf", async () => {
		await shares.shareWithPost([aShare()], aSharePost());

		await shares.removeSharedQuiz("share-1");

		expect(await shares.findSharedQuiz("g1", "quiz-1")).toBeNull();
		expect(await shares.sharedQuizIdsOf("g1")).toEqual([]);
		// The post stays, pointing at nothing.
		expect(await posts.findPost("g1", "post-1")).not.toBeNull();
	});

	it("deleting the quiz, the sharer's membership or the group removes the share (RN-22)", async () => {
		await shares.shareWithPost([aShare()], aSharePost());
		await quizzes.delete("quiz-1");
		expect(await shares.findSharedQuiz("g1", "quiz-1")).toBeNull();

		await shares.shareWithPost(
			[aShare({ id: "share-2", quizId: "quiz-2" })],
			aSharePost({ id: "post-2", sharedQuizId: "share-2" }),
		);
		await members.remove("g1", "bruno");
		expect(await shares.findSharedQuiz("g1", "quiz-2")).toBeNull();
		expect(await posts.findPost("g1", "post-2")).not.toBeNull();
	});

	it("a trashed quiz keeps its share, so it comes back when restored (RN-23)", async () => {
		await shares.shareWithPost([aShare()], aSharePost());

		await quizzes.save(trashQuiz(aPublishedQuiz({ ownerId: "bruno" }), at(5)));

		expect(await shares.findSharedQuiz("g1", "quiz-1")).not.toBeNull();
	});

	it("a share needs the sharer to be a member of the group", async () => {
		await expect(
			shares.shareWithPost(
				[aShare({ groupId: "g2" })],
				aSharePost({ groupId: "g2" }),
			),
		).rejects.toThrow();
	});

	it("a quizShare post requires shared_quiz_id and other kinds refuse it", async () => {
		await expect(
			testDb.db.insert(groupPost).values({
				id: "p",
				groupId: "g1",
				authorId: "bruno",
				kind: "quizShare",
				createdAt: at(1),
			}),
		).rejects.toThrow();
		await expect(
			testDb.db.insert(groupPost).values({
				id: "p",
				groupId: "g1",
				authorId: "bruno",
				kind: "message",
				message: "oi",
				sharedQuizId: "share-1",
				createdAt: at(1),
			}),
		).rejects.toThrow();
	});

	it("the feed carries sharedQuizId", async () => {
		await shares.shareWithPost([aShare()], aSharePost());

		const [record] = await feed.listPosts("g1", "carla");

		expect(record).toMatchObject({
			kind: "quizShare",
			sharedQuizId: "share-1",
		});
	});

	it("grants: a member of a group with the share may use the quiz, not after leaving nor an outsider", async () => {
		await shares.shareWithPost([aShare()], aSharePost());

		expect(await grants.canUse("carla", "quiz-1")).toBe(true);
		expect(await grants.canUse("carla", "quiz-2")).toBe(false);
		await members.remove("g1", "carla");
		expect(await grants.canUse("carla", "quiz-1")).toBe(false);

		await shares.removeSharedQuiz("share-1");
		expect(await grants.canUse("ana", "quiz-1")).toBe(false);
	});
});
