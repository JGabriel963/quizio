import { describe, expect, it } from "vitest";

import {
	GroupNotFoundError,
	InvalidPostMessageError,
	QuizAlreadySharedError,
	QuizNotShareableError,
	ShareNotAllowedError,
} from "../domain/group-errors";
import { groupsTestDeps } from "../testing/groups-test-deps";
import { createShareQuizzesInGroup } from "./share-quizzes-in-group";

async function setup() {
	const t = groupsTestDeps();
	const groupId = await t.aGroupOf("ana", ["bruno", "carla"]);
	for (const [id, ownerId] of [
		["capitais", "ana"],
		["rios", "ana"],
		["mapas", "bruno"],
	] as const) {
		t.sharedQuizReads.addQuiz({ id, ownerId, title: id });
	}
	t.sharedQuizReads.addQuiz({
		id: "rascunho",
		ownerId: "ana",
		published: false,
	});
	t.sharedQuizReads.addQuiz({ id: "velho", ownerId: "ana", trashed: true });
	return { ...t, groupId, share: createShareQuizzesInGroup(t.deps) };
}

describe("shareQuizzesInGroup (spec 037)", () => {
	it("shares one quiz with a quizShare post that points at its share, with an optional message", async () => {
		const t = await setup();

		const { postId } = await t.share({
			userId: "bruno",
			groupId: t.groupId,
			quizIds: ["mapas"],
			message: " Para a revisão ",
		});

		const share = await t.store.findSharedQuiz(t.groupId, "mapas");
		expect(share).toMatchObject({
			quizId: "mapas",
			sharedById: "bruno",
			sharedAt: t.clock.now(),
		});
		expect(await t.store.findPost(t.groupId, postId)).toMatchObject({
			kind: "quizShare",
			authorId: "bruno",
			message: "Para a revisão",
			sharedQuizId: share?.id,
			gameId: null,
			file: null,
		});
	});

	it("shares several quizzes with one quizzesShare post without text (RN-06)", async () => {
		const t = await setup();

		const { postId } = await t.share({
			userId: "ana",
			groupId: t.groupId,
			quizIds: ["capitais", "rios", "capitais"],
		});

		expect((await t.store.sharedQuizIdsOf(t.groupId)).sort()).toEqual([
			"capitais",
			"rios",
		]);
		expect(await t.store.findPost(t.groupId, postId)).toMatchObject({
			kind: "quizzesShare",
			message: null,
			sharedQuizId: null,
		});
	});

	it("refuses a member without membersCanShare with GROUP.SHARE_NOT_ALLOWED (RN-01)", async () => {
		const t = await setup();
		await t.store.savePermission(t.groupId, "membersCanShare", false);

		await expect(
			t.share({ userId: "bruno", groupId: t.groupId, quizIds: ["mapas"] }),
		).rejects.toThrow(ShareNotAllowedError);
		expect(await t.store.sharedQuizIdsOf(t.groupId)).toEqual([]);
		// The admin still shares.
		await t.share({ userId: "ana", groupId: t.groupId, quizIds: ["rios"] });
	});

	it("refuses drafts, trashed and foreign quizzes with GROUP.QUIZ_NOT_SHAREABLE and shares none (RN-02)", async () => {
		const t = await setup();

		for (const other of ["rascunho", "velho", "mapas", "nenhum"]) {
			await expect(
				t.share({
					userId: "ana",
					groupId: t.groupId,
					quizIds: ["capitais", other],
				}),
			).rejects.toThrow(QuizNotShareableError);
		}
		expect(await t.store.sharedQuizIdsOf(t.groupId)).toEqual([]);
		expect(await t.store.listPosts(t.groupId, "ana")).toEqual([]);
	});

	it("refuses a quiz already in the group with GROUP.QUIZ_ALREADY_SHARED and writes nothing (RN-04)", async () => {
		const t = await setup();
		await t.share({ userId: "ana", groupId: t.groupId, quizIds: ["rios"] });

		await expect(
			t.share({
				userId: "ana",
				groupId: t.groupId,
				quizIds: ["capitais", "rios"],
			}),
		).rejects.toThrow(QuizAlreadySharedError);
		expect(await t.store.sharedQuizIdsOf(t.groupId)).toEqual(["rios"]);
		expect(await t.store.listPosts(t.groupId, "ana")).toHaveLength(1);
	});

	it("refuses a message over 500 characters and no quiz at all", async () => {
		const t = await setup();

		await expect(
			t.share({
				userId: "ana",
				groupId: t.groupId,
				quizIds: ["rios"],
				message: "a".repeat(501),
			}),
		).rejects.toThrow(InvalidPostMessageError);
		await expect(
			t.share({ userId: "ana", groupId: t.groupId, quizIds: [] }),
		).rejects.toThrow(QuizNotShareableError);
	});

	it("refuses a non-member with GROUP.NOT_FOUND", async () => {
		const t = await setup();
		t.store.addUser({ id: "diego", name: "Diego", email: "d@exemplo.com" });

		await expect(
			t.share({ userId: "diego", groupId: t.groupId, quizIds: ["rios"] }),
		).rejects.toThrow(GroupNotFoundError);
	});
});
