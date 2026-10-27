import { describe, expect, it } from "vitest";

import {
	SharedQuizNotFoundError,
	UnshareNotAllowedError,
} from "../domain/group-errors";
import { groupsTestDeps } from "../testing/groups-test-deps";
import { createShareQuizzesInGroup } from "./share-quizzes-in-group";
import { createUnshareQuiz } from "./unshare-quiz";

async function setup() {
	const t = groupsTestDeps();
	const groupId = await t.aGroupOf("ana", ["bruno", "carla"]);
	t.sharedQuizReads.addQuiz({ id: "capitais", ownerId: "bruno" });
	await createShareQuizzesInGroup(t.deps)({
		userId: "bruno",
		groupId,
		quizIds: ["capitais"],
	});
	return { ...t, groupId, unshare: createUnshareQuiz(t.deps) };
}

describe("unshareQuiz (spec 037, RN-13)", () => {
	it("who shared and the admin remove it from the group", async () => {
		for (const userId of ["bruno", "ana"]) {
			const t = await setup();

			await t.unshare({ userId, groupId: t.groupId, quizId: "capitais" });

			expect(await t.store.findSharedQuiz(t.groupId, "capitais")).toBeNull();
		}
	});

	it("another member is refused with GROUP.UNSHARE_NOT_ALLOWED", async () => {
		const t = await setup();

		await expect(
			t.unshare({ userId: "carla", groupId: t.groupId, quizId: "capitais" }),
		).rejects.toThrow(UnshareNotAllowedError);
		expect(await t.store.findSharedQuiz(t.groupId, "capitais")).not.toBeNull();
	});

	it("a quiz not in the group is GROUP.SHARED_QUIZ_NOT_FOUND", async () => {
		const t = await setup();

		await expect(
			t.unshare({ userId: "ana", groupId: t.groupId, quizId: "rios" }),
		).rejects.toThrow(SharedQuizNotFoundError);
	});
});
