import { describe, expect, it } from "vitest";

import { PostDeleteNotAllowedError } from "../domain/group-errors";
import { groupsTestDeps } from "../testing/groups-test-deps";
import { createCreateGroupPost } from "./create-group-post";
import { createDeleteGroup } from "./delete-group";
import { createDeleteGroupPost } from "./delete-group-post";
import { createListGroupFeed } from "./list-group-feed";
import { createRequestGroupUpload } from "./request-group-upload";

/** Ana's group with Bruno and Carla, and Bruno's PDF post. */
async function setup() {
	const t = groupsTestDeps();
	const groupId = await t.aGroupOf("ana", ["bruno", "carla"]);
	const upload = (userId: string) =>
		createRequestGroupUpload(t.deps)({
			userId,
			groupId,
			type: "pdf",
			contentType: "application/pdf",
			sizeBytes: 100,
			fileName: "apostila.pdf",
		}).then(({ key }) => {
			t.deps.storage.simulateUpload(key);
			return key;
		});
	const post = (userId: string, message: string, uploadKey?: string) =>
		createCreateGroupPost(t.deps)({ userId, groupId, message, uploadKey });
	const feed = (userId: string, cursor?: { createdAt: Date; id: string }) =>
		createListGroupFeed(t.deps)({ userId, groupId, cursor });
	return { ...t, groupId, upload, post, feed };
}

describe("the paged feed (spec 036, RN-18)", () => {
	it("returns 20 posts and a cursor while there are more; the next page starts after it; the last has none", async () => {
		const t = await setup();
		const ids: string[] = [];
		for (let index = 0; index < 25; index++) {
			ids.unshift((await t.post("bruno", `#${index}`)).postId);
			t.clock.advanceBy(3000);
		}

		const first = await t.feed("ana");
		expect(first.posts.map((post) => post.id)).toEqual(ids.slice(0, 20));
		expect(first.nextCursor).not.toBeNull();

		const second = await t.feed("ana", first.nextCursor ?? undefined);
		expect(second.posts.map((post) => post.id)).toEqual(ids.slice(20));
		expect(second.nextCursor).toBeNull();
	});
});

describe("message posts in the feed (spec 036, RN-17, RN-19)", () => {
	it("a message post offers delete and no report to its author and the admin", async () => {
		const t = await setup();
		await t.post("bruno", "Oi");

		const [forBruno] = (await t.feed("bruno")).posts;
		const [forAna] = (await t.feed("ana")).posts;
		const [forCarla] = (await t.feed("carla")).posts;

		expect(forBruno).toMatchObject({ canDelete: true, canSeeReport: false });
		expect(forAna).toMatchObject({ canDelete: true, canSeeReport: false });
		expect(forCarla).toMatchObject({ canDelete: false, canSeeReport: false });
	});
});

describe("files leave with their posts (spec 036, RN-20, RN-21)", () => {
	it("deleting a post deletes its file", async () => {
		const t = await setup();
		const key = await t.upload("bruno");
		const { postId } = await t.post("bruno", "", key);

		await createDeleteGroupPost(t.deps)({
			userId: "ana",
			groupId: t.groupId,
			postId,
		});

		expect((await t.feed("ana")).posts).toEqual([]);
		expect(t.deps.storage.keys()).not.toContain(key);
	});

	it("a member who did not post is refused and nothing is deleted", async () => {
		const t = await setup();
		const key = await t.upload("bruno");
		const { postId } = await t.post("bruno", "", key);

		await expect(
			createDeleteGroupPost(t.deps)({
				userId: "carla",
				groupId: t.groupId,
				postId,
			}),
		).rejects.toThrow(PostDeleteNotAllowedError);
		expect(t.deps.storage.keys()).toContain(key);
	});

	it("deleting the group deletes posted and pending files", async () => {
		const t = await setup();
		const posted = await t.upload("bruno");
		await t.post("bruno", "", posted);
		const pending = await t.upload("carla");
		const elsewhere = await t.aGroupOf("bruno", [], "Outro");
		const { key: kept } = await createRequestGroupUpload(t.deps)({
			userId: "bruno",
			groupId: elsewhere,
			type: "pdf",
			contentType: "application/pdf",
			sizeBytes: 100,
			fileName: "b.pdf",
		});
		t.deps.storage.simulateUpload(kept);

		await createDeleteGroup(t.deps)({ userId: "ana", groupId: t.groupId });

		expect(t.deps.storage.keys()).not.toContain(posted);
		expect(t.deps.storage.keys()).not.toContain(pending);
		expect(t.deps.storage.keys()).toContain(kept);
	});
});
