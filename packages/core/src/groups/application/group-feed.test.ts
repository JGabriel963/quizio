import { describe, expect, it } from "vitest";

import {
	GroupNotFoundError,
	GroupPostNotFoundError,
	PostDeleteNotAllowedError,
} from "../domain/group-errors";
import { groupsTestDeps } from "../testing/groups-test-deps";
import { createAssignInGroup } from "./assign-in-group";
import { createDeleteGroupPost } from "./delete-group-post";
import { createLeaveGroup } from "./leave-group";
import { createListGroupAssignments } from "./list-group-assignments";
import { createListGroupFeed } from "./list-group-feed";
import { createSetPostLike } from "./set-post-like";

const HOUR = 60 * 60 * 1000;
const options = {
	gameCharacters: false,
	questionTimer: true,
	randomizeAnswers: false,
};

/** Ana's group with Bruno (allowed to assign) and Carla. */
async function setup() {
	const t = groupsTestDeps();
	const groupId = await t.aGroupOf("ana", ["bruno", "carla"]);
	await t.store.savePermission(groupId, "membersCanAssign", true);
	const assign = (userId: string, hoursLeft: number, message?: string) =>
		createAssignInGroup(t.deps)({
			userId,
			groupId,
			quizId: `quiz-${userId}`,
			deadline: new Date(t.clock.now().getTime() + hoursLeft * HOUR),
			options,
			message,
		});
	const feed = (userId: string) =>
		createListGroupFeed(t.deps)({ userId, groupId });
	return { ...t, groupId, assign, feed };
}

describe("listGroupFeed (spec 038)", () => {
	it("newest first, with author, message, likes and the viewer's like", async () => {
		const t = await setup();
		const old = await t.assign("ana", 72);
		t.clock.advanceBy(60_000);
		const recent = await t.assign("bruno", 24, "Revisem");
		await createSetPostLike(t.deps)({
			userId: "carla",
			groupId: t.groupId,
			postId: old.postId,
			liked: true,
		});

		const { posts } = await t.feed("carla");

		expect(posts.map((post) => post.id)).toEqual([recent.postId, old.postId]);
		expect(posts[0]).toMatchObject({
			author: { userId: "bruno", name: "Bruno" },
			message: "Revisem",
			likeCount: 0,
			liked: false,
			attachment: {
				gameId: recent.gameId,
				name: "Capitais de Bruno",
				questionCount: 5,
				coverUrl: "https://media.test/media/bruno/cover.png",
				ownerName: "Bruno",
				remainingMs: 24 * HOUR,
			},
		});
		expect(posts[1]).toMatchObject({ likeCount: 1, liked: true });
	});

	it("an ended, expired or deleted assignment loses its attachment, keeping the message and likes (RN-16)", async () => {
		const t = await setup();
		const ended = await t.assign("ana", 72, "Encerrada");
		const expiring = await t.assign("ana", 1);
		const deleted = await t.assign("ana", 72);
		await createSetPostLike(t.deps)({
			userId: "bruno",
			groupId: t.groupId,
			postId: ended.postId,
			liked: true,
		});

		t.assignments.end(ended.gameId, t.clock.now());
		t.assignments.remove(deleted.gameId);
		t.clock.advanceBy(HOUR);
		const { posts } = await t.feed("ana");

		const byId = new Map(posts.map((post) => [post.id, post]));
		expect(byId.get(ended.postId)).toMatchObject({
			attachment: null,
			message: "Encerrada",
			likeCount: 1,
			canSeeReport: true,
		});
		expect(byId.get(expiring.postId)?.attachment).toBeNull();
		expect(byId.get(deleted.postId)).toMatchObject({
			attachment: null,
			canSeeReport: false,
		});
	});

	it("canSeeReport and canDelete for the author and the admin; none for others (RN-20)", async () => {
		const t = await setup();
		await t.assign("bruno", 24);

		const [forBruno] = (await t.feed("bruno")).posts;
		const [forAna] = (await t.feed("ana")).posts;
		const [forCarla] = (await t.feed("carla")).posts;

		expect(forBruno).toMatchObject({ canSeeReport: true, canDelete: true });
		expect(forAna).toMatchObject({ canSeeReport: true, canDelete: true });
		expect(forCarla).toMatchObject({ canSeeReport: false, canDelete: false });
	});

	it("a post stays after its author leaves; only the admin may delete it (RN-31, RN-32)", async () => {
		const t = await setup();
		const post = await t.assign("bruno", 24);
		await createLeaveGroup(t.deps)({ userId: "bruno", groupId: t.groupId });
		await t.store.savePermission(t.groupId, "membersCanAssign", false);

		const [forAna] = (await t.feed("ana")).posts;

		expect(forAna).toMatchObject({
			id: post.postId,
			author: { name: "Bruno" },
			canDelete: true,
		});
		expect(forAna?.attachment).not.toBeNull();
	});

	it("an outsider gets GROUP.NOT_FOUND", async () => {
		const t = await setup();

		await expect(
			createListGroupFeed(t.deps)({ userId: "nobody", groupId: t.groupId }),
		).rejects.toThrow(GroupNotFoundError);
	});
});

describe("listGroupAssignments (spec 038, RN-22, RN-23)", () => {
	it("only open assignments, sorted", async () => {
		const t = await setup();
		const first = await t.assign("ana", 72);
		t.clock.advanceBy(60_000);
		const second = await t.assign("bruno", 24);
		t.clock.advanceBy(60_000);
		const ended = await t.assign("ana", 48);
		t.assignments.end(ended.gameId, t.clock.now());
		const list = (sort: "recent" | "oldest" | "deadline") =>
			createListGroupAssignments(t.deps)({
				userId: "carla",
				groupId: t.groupId,
				sort,
			});

		const recent = await list("recent");
		expect(recent.items.map((item) => item.gameId)).toEqual([
			second.gameId,
			first.gameId,
		]);
		expect(recent.items[0]).toMatchObject({
			postId: second.postId,
			assignedBy: { userId: "bruno", name: "Bruno" },
			canSeeReport: false,
			canDelete: false,
		});
		expect((await list("oldest")).items.map((item) => item.gameId)).toEqual([
			first.gameId,
			second.gameId,
		]);
		expect((await list("deadline")).items.map((item) => item.gameId)).toEqual([
			second.gameId,
			first.gameId,
		]);
	});

	it("an outsider gets GROUP.NOT_FOUND", async () => {
		const t = await setup();

		await expect(
			createListGroupAssignments(t.deps)({
				userId: "nobody",
				groupId: t.groupId,
				sort: "recent",
			}),
		).rejects.toThrow(GroupNotFoundError);
	});
});

describe("setPostLike (spec 038, RN-17, RN-18)", () => {
	it("likes and unlikes, telling the count; two likes at once count once", async () => {
		const t = await setup();
		const { postId } = await t.assign("ana", 24);
		const like = (userId: string, liked: boolean) =>
			createSetPostLike(t.deps)({ userId, groupId: t.groupId, postId, liked });

		await Promise.all([like("bruno", true), like("bruno", true)]);
		expect(await like("carla", true)).toEqual({ liked: true, likeCount: 2 });
		expect(await like("bruno", false)).toEqual({ liked: false, likeCount: 1 });
	});

	it("an outsider cannot like, nor a post of another group", async () => {
		const t = await setup();
		const { postId } = await t.assign("ana", 24);
		const other = await t.aGroupOf("bruno", [], "Outro");

		await expect(
			createSetPostLike(t.deps)({
				userId: "nobody",
				groupId: t.groupId,
				postId,
				liked: true,
			}),
		).rejects.toThrow(GroupNotFoundError);
		await expect(
			createSetPostLike(t.deps)({
				userId: "bruno",
				groupId: other,
				postId,
				liked: true,
			}),
		).rejects.toThrow(GroupPostNotFoundError);
	});
});

describe("deleteGroupPost (spec 038, RN-20, RN-21)", () => {
	it("the author and the admin delete it; the assignment stays", async () => {
		const t = await setup();
		const byBruno = await t.assign("bruno", 24);
		const byAna = await t.assign("ana", 24);
		const remove = createDeleteGroupPost(t.deps);

		await remove({
			userId: "bruno",
			groupId: t.groupId,
			postId: byBruno.postId,
		});
		await remove({ userId: "ana", groupId: t.groupId, postId: byAna.postId });

		expect((await t.feed("ana")).posts).toEqual([]);
		expect(
			await t.assignments.findAssignments([byBruno.gameId, byAna.gameId]),
		).toHaveLength(2);
	});

	it("a member who did not assign gets GROUP.POST_DELETE_NOT_ALLOWED", async () => {
		const t = await setup();
		const { postId } = await t.assign("bruno", 24);

		await expect(
			createDeleteGroupPost(t.deps)({
				userId: "carla",
				groupId: t.groupId,
				postId,
			}),
		).rejects.toThrow(PostDeleteNotAllowedError);
	});

	it("a post of another group is GROUP.POST_NOT_FOUND", async () => {
		const t = await setup();
		const { postId } = await t.assign("ana", 24);
		const other = await t.aGroupOf("ana", [], "Outro");

		await expect(
			createDeleteGroupPost(t.deps)({ userId: "ana", groupId: other, postId }),
		).rejects.toThrow(GroupPostNotFoundError);
	});
});
