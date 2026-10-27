import { describe, expect, it } from "vitest";

import type { GroupPost } from "../domain/group-post";
import type { SharedQuiz } from "../domain/shared-quiz";
import { groupsTestDeps } from "./groups-test-deps";

const at = (minute: number) =>
	new Date(`2026-10-26T12:${String(minute).padStart(2, "0")}:00.000Z`);

function aShare(overrides: Partial<SharedQuiz> = {}): SharedQuiz {
	return {
		id: "share-1",
		groupId: "g1",
		quizId: "quiz-1",
		sharedById: "ana",
		sharedAt: at(1),
		...overrides,
	};
}

function aSharePost(overrides: Partial<GroupPost> = {}): GroupPost {
	return {
		id: "post-1",
		groupId: "g1",
		authorId: "ana",
		kind: "quizShare",
		message: null,
		gameId: null,
		file: null,
		sharedQuizId: "share-1",
		createdAt: at(1),
		...overrides,
	};
}

describe("in-memory shared quizzes (spec 037)", () => {
	it("shareWithPost writes the rows and the post, or nothing when a quiz is already shared", async () => {
		const { store } = groupsTestDeps();

		expect(await store.shareWithPost([aShare()], aSharePost())).toBe("created");
		expect(await store.findSharedQuiz("g1", "quiz-1")).toMatchObject({
			id: "share-1",
		});
		expect(await store.findPost("g1", "post-1")).not.toBeNull();

		const again = await store.shareWithPost(
			[
				aShare({ id: "share-2", quizId: "quiz-2" }),
				aShare({ id: "share-3", quizId: "quiz-1" }),
			],
			aSharePost({ id: "post-2", kind: "quizzesShare", sharedQuizId: null }),
		);

		expect(again).toBe("alreadyShared");
		expect(await store.sharedQuizIdsOf("g1")).toEqual(["quiz-1"]);
		expect(await store.findPost("g1", "post-2")).toBeNull();
	});

	it("list hides trashed and unpublished quizzes and sorts recent, oldest, nameAsc, nameDesc", async () => {
		const { store, sharedQuizReads } = groupsTestDeps();
		sharedQuizReads.addQuiz({ id: "biblia", ownerId: "ana", title: "Bíblia" });
		sharedQuizReads.addQuiz({
			id: "algebra",
			ownerId: "ana",
			title: "Álgebra",
		});
		sharedQuizReads.addQuiz({
			id: "capitais",
			ownerId: "ana",
			title: "Capitais",
		});
		sharedQuizReads.addQuiz({ id: "velho", ownerId: "ana", title: "Velho" });
		for (const [minute, quizId] of [
			[1, "biblia"],
			[2, "algebra"],
			[3, "capitais"],
			[4, "velho"],
		] as const) {
			await store.shareWithPost(
				[aShare({ id: `share-${quizId}`, quizId, sharedAt: at(minute) })],
				aSharePost({ id: `post-${quizId}`, sharedQuizId: `share-${quizId}` }),
			);
		}
		sharedQuizReads.updateQuiz("velho", { trashed: true });

		const titles = async (sort: "recent" | "oldest" | "nameAsc" | "nameDesc") =>
			(await sharedQuizReads.listSharedQuizzes("g1", sort, 20)).map(
				(card) => card.title,
			);

		expect(await titles("recent")).toEqual(["Capitais", "Álgebra", "Bíblia"]);
		expect(await titles("oldest")).toEqual(["Bíblia", "Álgebra", "Capitais"]);
		expect(await titles("nameAsc")).toEqual(["Álgebra", "Bíblia", "Capitais"]);
		expect(await titles("nameDesc")).toEqual(["Capitais", "Bíblia", "Álgebra"]);
		expect(await sharedQuizReads.sharedQuizCards(["share-velho"])).toEqual([]);
	});

	it("removing a member removes their shares", async () => {
		const { store, aGroupOf } = groupsTestDeps();
		const groupId = await aGroupOf("ana", ["bruno"]);
		await store.shareWithPost(
			[aShare({ groupId, sharedById: "bruno" })],
			aSharePost({ groupId, authorId: "bruno" }),
		);

		await store.remove(groupId, "bruno");

		expect(await store.findSharedQuiz(groupId, "quiz-1")).toBeNull();
		expect(await store.findPost(groupId, "post-1")).not.toBeNull();
	});
});
