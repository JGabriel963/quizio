import type { GroupPost } from "@quizio/core/groups/domain/group-post";
import { adminOf, aGroup } from "@quizio/core/groups/testing/a-group";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { user } from "../../schema/auth";
import { groupPostLike, groupTable } from "../../schema/groups";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleGroupFeedQuery } from "./drizzle-group-feed-query";
import { createDrizzleGroupPostRepository } from "./drizzle-group-post-repository";
import { createDrizzleGroupRepository } from "./drizzle-group-repository";

const at = (minute: number) =>
	new Date(`2026-10-26T12:${String(minute).padStart(2, "0")}:00.000Z`);

function aPost(overrides: Partial<GroupPost> = {}): GroupPost {
	return {
		id: "post-1",
		groupId: "g1",
		authorId: "ana",
		kind: "assignment",
		message: null,
		gameId: "game-1",
		sharedQuizId: null,
		file: null,
		createdAt: at(1),
		...overrides,
	};
}

describe("Drizzle group feed (spec 038)", () => {
	let testDb: TestDatabase;
	let groups: ReturnType<typeof createDrizzleGroupRepository>;
	let posts: ReturnType<typeof createDrizzleGroupPostRepository>;
	let feed: ReturnType<typeof createDrizzleGroupFeedQuery>;

	beforeAll(async () => {
		testDb = await createTestDb();
		await testDb.db.insert(user).values([
			{ id: "ana", name: "Ana", email: "ana@quizio.test" },
			{ id: "bruno", name: "Bruno", email: "bruno@quizio.test" },
		]);
		groups = createDrizzleGroupRepository(testDb.db);
		posts = createDrizzleGroupPostRepository(testDb.db);
		feed = createDrizzleGroupFeedQuery(testDb.db);
	});

	afterAll(() => testDb.close());

	beforeEach(async () => {
		await testDb.db.delete(groupTable);
		for (const id of ["g1", "g2"]) {
			const group = aGroup({ id, adminId: "ana", inviteCode: `code-${id}` });
			await groups.create(group, adminOf(group));
		}
	});

	it("creates a post and refuses the same assignment twice in a group (taken), also at once", async () => {
		expect(await posts.createPost(aPost())).toBe("created");
		expect(await posts.createPost(aPost({ id: "post-2" }))).toBe("taken");
		expect(await posts.createPost(aPost({ id: "post-3", groupId: "g2" }))).toBe(
			"created",
		);
		const results = await Promise.all([
			posts.createPost(aPost({ id: "a", gameId: "game-9" })),
			posts.createPost(aPost({ id: "b", gameId: "game-9" })),
		]);

		expect([...results].sort()).toEqual(["created", "taken"]);
		expect(await posts.findPost("g1", "post-1")).toEqual(aPost());
		expect(await posts.findPost("g2", "post-1")).toBeNull();
	});

	it("setLike likes once and unlikes", async () => {
		await posts.createPost(aPost());

		await Promise.all([
			posts.setLike("post-1", "bruno", true, at(2)),
			posts.setLike("post-1", "bruno", true, at(2)),
		]);
		expect(await feed.likeCount("post-1")).toBe(1);
		await posts.setLike("post-1", "bruno", false, at(3));
		expect(await feed.likeCount("post-1")).toBe(0);
	});

	it("deleting a post, or the group, takes its likes", async () => {
		await posts.createPost(aPost());
		await posts.createPost(aPost({ id: "post-2", gameId: "game-2" }));
		await posts.setLike("post-1", "bruno", true, at(2));
		await posts.setLike("post-2", "bruno", true, at(2));

		await posts.deletePost("post-1");
		expect(await posts.findPost("g1", "post-1")).toBeNull();
		await groups.delete("g1");

		expect(await testDb.db.select().from(groupPostLike)).toEqual([]);
		expect(await posts.findPost("g1", "post-2")).toBeNull();
	});

	it("lists newest first with author name, like count and the viewer's like", async () => {
		await posts.createPost(
			aPost({ id: "old", gameId: "g-old", createdAt: at(1) }),
		);
		await posts.createPost(
			aPost({
				id: "new",
				gameId: "g-new",
				authorId: "bruno",
				message: "Revisem\naté sexta",
				createdAt: at(5),
			}),
		);
		await posts.setLike("old", "bruno", true, at(6));
		await posts.setLike("old", "ana", true, at(6));

		const list = await feed.listPosts("g1", "bruno");

		expect(list).toEqual([
			{
				...aPost({
					id: "new",
					gameId: "g-new",
					authorId: "bruno",
					message: "Revisem\naté sexta",
					createdAt: at(5),
				}),
				authorName: "Bruno",
				likeCount: 0,
				likedByViewer: false,
			},
			{
				...aPost({ id: "old", gameId: "g-old" }),
				authorName: "Ana",
				likeCount: 2,
				likedByViewer: true,
			},
		]);
	});

	it("stats and groupsWithAssignment", async () => {
		await posts.createPost(aPost());
		await posts.createPost(aPost({ id: "post-2", groupId: "g2" }));

		expect(await feed.feedStats("g1")).toEqual({ posts: 1, assignments: 1 });
		expect(await feed.feedStats("g2")).toEqual({ posts: 1, assignments: 1 });
		expect(
			await feed.groupsWithAssignment("game-1", ["g1", "g2", "g3"]),
		).toEqual(expect.arrayContaining(["g1", "g2"]));
		expect(await feed.groupsWithAssignment("game-2", ["g1"])).toEqual([]);
		expect(await feed.groupsWithAssignment("game-1", [])).toEqual([]);
	});
});
