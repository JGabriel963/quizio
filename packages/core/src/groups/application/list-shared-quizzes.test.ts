import { describe, expect, it } from "vitest";

import { GroupNotFoundError } from "../domain/group-errors";
import { groupsTestDeps } from "../testing/groups-test-deps";
import { createListSharedQuizIds } from "./list-shared-quiz-ids";
import { createListSharedQuizzes } from "./list-shared-quizzes";
import { createShareQuizzesInGroup } from "./share-quizzes-in-group";

async function setup(count: number) {
	const t = groupsTestDeps();
	const groupId = await t.aGroupOf("ana", ["bruno", "carla"]);
	const share = createShareQuizzesInGroup(t.deps);
	for (let i = 1; i <= count; i++) {
		const id = `quiz-${String(i).padStart(2, "0")}`;
		t.sharedQuizReads.addQuiz({ id, ownerId: "ana", title: `Quiz ${i}` });
		t.clock.advanceBy(60_000);
		await share({ userId: "ana", groupId, quizIds: [id] });
	}
	return { ...t, groupId, list: createListSharedQuizzes(t.deps) };
}

describe("listSharedQuizzes (spec 037)", () => {
	it("lists alive shares in the chosen order, 20 per page with hasMore (RN-14, RN-15)", async () => {
		const t = await setup(23);

		const first = await t.list({
			userId: "carla",
			groupId: t.groupId,
			sort: "recent",
		});
		expect(first.items).toHaveLength(20);
		expect(first.items[0]?.quizId).toBe("quiz-23");
		expect(first.hasMore).toBe(true);

		const all = await t.list({
			userId: "carla",
			groupId: t.groupId,
			sort: "oldest",
			limit: 40,
		});
		expect(all.items).toHaveLength(23);
		expect(all.items[0]?.quizId).toBe("quiz-01");
		expect(all.hasMore).toBe(false);
	});

	it("each card has cover URL, question count, owner, visibility, sharedAt and games", async () => {
		const t = await setup(1);
		t.sharedQuizReads.updateQuiz("quiz-01", {
			coverImageKey: "media/ana/capa.png",
			visibility: "unlisted",
			games: 3,
		});

		const { items } = await t.list({
			userId: "carla",
			groupId: t.groupId,
			sort: "recent",
		});

		expect(items).toEqual([
			{
				sharedQuizId: expect.any(String),
				quizId: "quiz-01",
				title: "Quiz 1",
				coverUrl: "https://media.test/media/ana/capa.png",
				questionCount: 0,
				visibility: "unlisted",
				owner: { userId: "ana", name: "Ana" },
				sharedAt: t.clock.now(),
				games: 3,
				ownedByViewer: false,
				canUnshare: false,
			},
		]);
	});

	it("listSharedQuizIds returns the group's quiz ids; outsiders get GROUP.NOT_FOUND", async () => {
		const t = await setup(2);
		const ids = createListSharedQuizIds(t.deps);

		expect((await ids({ userId: "bruno", groupId: t.groupId })).sort()).toEqual(
			["quiz-01", "quiz-02"],
		);
		t.store.addUser({ id: "diego", name: "Diego", email: "d@exemplo.com" });
		await expect(ids({ userId: "diego", groupId: t.groupId })).rejects.toThrow(
			GroupNotFoundError,
		);
		await expect(
			t.list({ userId: "diego", groupId: t.groupId, sort: "recent" }),
		).rejects.toThrow(GroupNotFoundError);
	});
});
