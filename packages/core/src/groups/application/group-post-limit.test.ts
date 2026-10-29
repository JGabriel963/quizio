import { describe, expect, it } from "vitest";
import { TooManyGroupPostsError } from "../domain/group-errors";
import {
	GROUP_POSTS_PER_DAY,
	GROUP_POSTS_PER_MINUTE,
} from "../domain/group-post";
import { groupsTestDeps } from "../testing/groups-test-deps";
import { createCreateGroupPost } from "./create-group-post";
import { reserveGroupPost } from "./group-post-limit";
import { createShareQuizzesInGroup } from "./share-quizzes-in-group";

const MINUTE = 60_000;

async function setup() {
	const t = groupsTestDeps();
	const groupId = await t.aGroupOf("ana", ["bruno"]);
	const post = (userId = "bruno") =>
		createCreateGroupPost(t.deps)({ userId, groupId, message: "Aviso" });
	return { ...t, groupId, post };
}

describe("group posts per person (audit L9)", () => {
	it("takes 20 posts a minute from a person, then more the next minute", async () => {
		const t = await setup();
		for (let index = 0; index < GROUP_POSTS_PER_MINUTE; index++) {
			await t.post();
		}

		await expect(t.post()).rejects.toThrow(TooManyGroupPostsError);
		await expect(t.post("ana")).resolves.toBeDefined();
		t.clock.advanceBy(MINUTE);
		await expect(t.post()).resolves.toBeDefined();
	});

	it("takes at most 500 a day, however spread", async () => {
		const t = await setup();
		for (let index = 1; index < GROUP_POSTS_PER_DAY; index++) {
			await reserveGroupPost(t.deps, "bruno");
			if (index % GROUP_POSTS_PER_MINUTE === 0) {
				t.clock.advanceBy(MINUTE);
			}
		}
		t.clock.advanceBy(MINUTE);
		await t.post();

		t.clock.advanceBy(MINUTE);
		await expect(t.post()).rejects.toThrow(TooManyGroupPostsError);
	});

	it("counts shared quizzes as posts too", async () => {
		const t = await setup();
		t.sharedQuizReads.addQuiz({ id: "q1", ownerId: "bruno", title: "Q1" });
		for (let index = 0; index < GROUP_POSTS_PER_MINUTE; index++) {
			await t.post();
		}

		await expect(
			createShareQuizzesInGroup(t.deps)({
				userId: "bruno",
				groupId: t.groupId,
				quizIds: ["q1"],
			}),
		).rejects.toThrow(TooManyGroupPostsError);
	});
});
