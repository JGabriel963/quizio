import { describe, expect, it } from "vitest";

import { aQuestion } from "../../quiz/testing/a-question";
import {
	GroupNotFoundError,
	SharedQuizNotFoundError,
} from "../domain/group-errors";
import { groupsTestDeps } from "../testing/groups-test-deps";
import { createGetSharedQuiz } from "./get-shared-quiz";
import { createShareQuizzesInGroup } from "./share-quizzes-in-group";

async function setup() {
	const t = groupsTestDeps();
	const groupId = await t.aGroupOf("ana", ["bruno", "carla"]);
	const questions = [
		aQuestion({
			id: "q1",
			image: {
				key: "media/ana/q1.png",
				placement: "media",
				crop: null,
				altText: null,
			},
		}),
		aQuestion({ id: "q2", text: "Maior rio?" }),
	];
	t.sharedQuizReads.addQuiz({
		id: "capitais",
		ownerId: "ana",
		title: "Capitais",
		description: "Revisão",
		coverImageKey: "media/ana/capa.png",
		questions,
		games: 2,
		participants: 10,
	});
	await createShareQuizzesInGroup(t.deps)({
		userId: "ana",
		groupId,
		quizIds: ["capitais"],
	});
	return { ...t, groupId, questions, get: createGetSharedQuiz(t.deps) };
}

describe("getSharedQuiz (spec 037, RN-16)", () => {
	it("returns the published version with answers, image URLs, games, participants and ownedByViewer", async () => {
		const t = await setup();

		const view = await t.get({
			userId: "carla",
			groupId: t.groupId,
			quizId: "capitais",
		});

		expect(view).toEqual({
			quizId: "capitais",
			title: "Capitais",
			description: "Revisão",
			coverUrl: "https://media.test/media/ana/capa.png",
			visibility: "private",
			owner: { userId: "ana", name: "Ana" },
			sharedBy: { userId: "ana", name: "Ana" },
			sharedAt: t.clock.now(),
			games: 2,
			participants: 10,
			questions: t.questions,
			imageUrls: { "media/ana/q1.png": "https://media.test/media/ana/q1.png" },
			ownedByViewer: false,
			canUnshare: false,
		});
		expect(
			(await t.get({ userId: "ana", groupId: t.groupId, quizId: "capitais" }))
				.ownedByViewer,
		).toBe(true);
	});

	it("a quiz not shared or in the trash is GROUP.SHARED_QUIZ_NOT_FOUND (RN-23, RN-25)", async () => {
		const t = await setup();

		await expect(
			t.get({ userId: "carla", groupId: t.groupId, quizId: "rios" }),
		).rejects.toThrow(SharedQuizNotFoundError);
		t.sharedQuizReads.updateQuiz("capitais", { trashed: true });
		await expect(
			t.get({ userId: "carla", groupId: t.groupId, quizId: "capitais" }),
		).rejects.toThrow(SharedQuizNotFoundError);
	});

	it("an outsider gets GROUP.NOT_FOUND", async () => {
		const t = await setup();
		t.store.addUser({ id: "diego", name: "Diego", email: "d@exemplo.com" });

		await expect(
			t.get({ userId: "diego", groupId: t.groupId, quizId: "capitais" }),
		).rejects.toThrow(GroupNotFoundError);
	});
});
