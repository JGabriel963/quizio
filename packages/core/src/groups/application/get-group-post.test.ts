import { describe, expect, it } from "vitest";

import {
	GroupNotFoundError,
	GroupPostNotFoundError,
} from "../domain/group-errors";
import { groupsTestDeps } from "../testing/groups-test-deps";
import { createCreateGroupPost } from "./create-group-post";
import { createDeleteGroupPost } from "./delete-group-post";
import { createGetGroupPost } from "./get-group-post";
import { createSetPostLike } from "./set-post-like";

async function setup() {
	const t = groupsTestDeps();
	const groupId = await t.aGroupOf("ana", ["bruno"]);
	const { postId } = await createCreateGroupPost(t.deps)({
		userId: "bruno",
		groupId,
		message: "Prova na sexta",
	});
	return { ...t, groupId, postId, getPost: createGetGroupPost(t.deps) };
}

describe("getGroupPost (spec 040, RN-19, RN-20)", () => {
	it("returns the post as the feed shows it", async () => {
		const t = await setup();
		await createSetPostLike(t.deps)({
			userId: "ana",
			groupId: t.groupId,
			postId: t.postId,
			liked: true,
		});

		const post = await t.getPost({
			userId: "ana",
			groupId: t.groupId,
			postId: t.postId,
		});

		expect(post).toMatchObject({
			id: t.postId,
			headline: "message",
			author: { userId: "bruno", name: "Bruno", photoUrl: null },
			message: "Prova na sexta",
			likeCount: 1,
			liked: true,
			canDelete: true,
		});
	});

	it("a deleted post is GROUP.POST_NOT_FOUND", async () => {
		const t = await setup();
		await createDeleteGroupPost(t.deps)({
			userId: "bruno",
			groupId: t.groupId,
			postId: t.postId,
		});

		await expect(
			t.getPost({ userId: "ana", groupId: t.groupId, postId: t.postId }),
		).rejects.toThrow(GroupPostNotFoundError);
	});

	it("somebody outside the group gets GROUP.NOT_FOUND", async () => {
		const t = await setup();

		await expect(
			t.getPost({ userId: "carla", groupId: t.groupId, postId: t.postId }),
		).rejects.toThrow(GroupNotFoundError);
	});
});
