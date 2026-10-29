import { describe, expect, it } from "vitest";

import type { GroupPost } from "../domain/group-post";
import { adminOf, aGroup } from "./a-group";
import { InMemoryGroupStore } from "./in-memory-group-store";

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

async function setup() {
	const store = new InMemoryGroupStore();
	store.addUser({ id: "ana", name: "Ana", email: "ana@exemplo.com" });
	store.addUser({ id: "bruno", name: "Bruno", email: "bruno@exemplo.com" });
	const group = aGroup({ id: "g1", adminId: "ana" });
	await store.create(group, adminOf(group));
	return store;
}

describe("InMemoryGroupStore, the feed (spec 038)", () => {
	it("creates a post once per assignment and group (taken)", async () => {
		const store = await setup();

		expect(await store.createPost(aPost())).toBe("created");
		expect(await store.createPost(aPost({ id: "post-2" }))).toBe("taken");
		expect(
			await store.createPost(aPost({ id: "post-3", gameId: "game-2" })),
		).toBe("created");
		expect(await store.findPost("g1", "post-1")).toEqual(aPost());
		expect(await store.findPost("other", "post-1")).toBeNull();
	});

	it("setLike is idempotent and unlikes", async () => {
		const store = await setup();
		await store.createPost(aPost());

		await store.setLike("post-1", "bruno", true, at(2));
		await store.setLike("post-1", "bruno", true, at(3));
		expect(await store.likeCount("post-1")).toBe(1);
		await store.setLike("post-1", "bruno", false, at(4));
		expect(await store.likeCount("post-1")).toBe(0);
	});

	it("lists posts newest first with author, likes and the viewer's like", async () => {
		const store = await setup();
		await store.createPost(
			aPost({ id: "old", gameId: "g-old", createdAt: at(1) }),
		);
		await store.createPost(
			aPost({ id: "new", gameId: "g-new", message: "Oi", createdAt: at(5) }),
		);
		await store.setLike("old", "bruno", true, at(6));

		const posts = await store.listPosts("g1", "bruno");

		expect(posts.map((post) => post.id)).toEqual(["new", "old"]);
		expect(posts[1]).toMatchObject({
			authorName: "Ana",
			likeCount: 1,
			likedByViewer: true,
		});
		expect(await store.feedStats("g1")).toEqual({ posts: 2, assignments: 2 });
		expect(await store.groupsWithAssignment("g-new", ["g1", "g2"])).toEqual([
			"g1",
		]);
	});

	it("lists only the assignment posts, newest first, up to the limit (audit L9)", async () => {
		const store = await setup();
		await store.createPost(
			aPost({ id: "a1", gameId: "game-a1", createdAt: at(1) }),
		);
		await store.createPost(
			aPost({
				id: "m1",
				kind: "message",
				gameId: null,
				message: "Oi",
				createdAt: at(2),
			}),
		);
		await store.createPost(
			aPost({ id: "a2", gameId: "game-a2", createdAt: at(3) }),
		);
		await store.createPost(
			aPost({ id: "a3", gameId: "game-a3", createdAt: at(4) }),
		);

		const listed = await store.listAssignmentPosts("g1", "bruno", 2);

		expect(listed.map((post) => post.id)).toEqual(["a3", "a2"]);
		expect(listed[0]).toMatchObject({ authorName: "Ana", likeCount: 0 });
	});

	it("deleting a post or the group takes its likes", async () => {
		const store = await setup();
		await store.createPost(aPost());
		await store.setLike("post-1", "bruno", true, at(2));

		await store.deletePost("post-1");
		expect(await store.likeCount("post-1")).toBe(0);
		expect(await store.listPosts("g1", "ana")).toEqual([]);

		await store.createPost(aPost({ id: "post-2" }));
		await store.delete("g1");
		expect(await store.findPost("g1", "post-2")).toBeNull();
	});
});
