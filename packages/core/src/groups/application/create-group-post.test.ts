import { describe, expect, it } from "vitest";

import {
	EmptyPostError,
	GroupNotFoundError,
	GroupUploadNotFoundError,
	InvalidPostMessageError,
} from "../domain/group-errors";
import { groupsTestDeps } from "../testing/groups-test-deps";
import { createCreateGroupPost } from "./create-group-post";
import { createListGroupFeed } from "./list-group-feed";
import { createRequestGroupUpload } from "./request-group-upload";

const MB = 1024 * 1024;

async function setup() {
	const t = groupsTestDeps();
	const groupId = await t.aGroupOf("ana", ["bruno"]);
	const otherGroupId = await t.aGroupOf("carla", ["bruno"], "Coral");
	const post = createCreateGroupPost(t.deps);
	const feed = (userId: string) =>
		createListGroupFeed(t.deps)({ userId, groupId });
	const upload = async (
		userId = "bruno",
		type: "image" | "pdf" = "pdf",
		inGroup = groupId,
	) => {
		const { key } = await createRequestGroupUpload(t.deps)({
			userId,
			groupId: inGroup,
			type,
			contentType: type === "pdf" ? "application/pdf" : "image/png",
			sizeBytes: 2 * MB,
			fileName: type === "pdf" ? "apostila.pdf" : "quadro.png",
		});
		t.deps.storage.simulateUpload(key);
		return key;
	};
	return { ...t, groupId, otherGroupId, post, feed, upload };
}

describe("createGroupPost (spec 036)", () => {
	it("a member posts a message, newest first", async () => {
		const t = await setup();
		await t.post({ userId: "ana", groupId: t.groupId, message: "Primeiro" });
		t.clock.advanceBy(60_000);

		const { postId } = await t.post({
			userId: "bruno",
			groupId: t.groupId,
			message: "  Prova na sexta\nTragam lápis ",
		});

		const { posts } = await t.feed("ana");
		expect(posts.map((post) => post.message)).toEqual([
			"Prova na sexta\nTragam lápis",
			"Primeiro",
		]);
		expect(posts[0]).toMatchObject({
			id: postId,
			author: { userId: "bruno", name: "Bruno" },
			headline: "message",
			file: null,
			gameId: null,
			attachment: null,
		});
	});

	it("the admin posts too", async () => {
		const t = await setup();

		await t.post({ userId: "ana", groupId: t.groupId, message: "Oi" });

		expect((await t.feed("bruno")).posts).toHaveLength(1);
	});

	it("posts an image or a PDF consuming its upload once", async () => {
		const t = await setup();
		const image = await t.upload("bruno", "image");
		const pdf = await t.upload("bruno", "pdf");

		await t.post({
			userId: "bruno",
			groupId: t.groupId,
			message: "",
			uploadKey: image,
		});
		t.clock.advanceBy(1000);
		await t.post({
			userId: "bruno",
			groupId: t.groupId,
			message: "Leiam",
			uploadKey: pdf,
		});

		const { posts } = await t.feed("ana");
		expect(posts[0]).toMatchObject({
			headline: "file",
			message: "Leiam",
			file: {
				type: "pdf",
				url: `https://media.test/${pdf}`,
				name: "apostila.pdf",
				sizeBytes: 2 * MB,
			},
		});
		expect(posts[1]).toMatchObject({
			headline: "image",
			message: null,
			file: { type: "image", name: "quadro.png" },
		});
		expect(await t.store.findUpload(image)).toBeNull();
		await expect(
			t.post({
				userId: "bruno",
				groupId: t.groupId,
				message: "De novo",
				uploadKey: image,
			}),
		).rejects.toThrow(GroupUploadNotFoundError);
	});

	it("a post with a file needs no text", async () => {
		const t = await setup();
		const key = await t.upload();

		await expect(
			t.post({
				userId: "bruno",
				groupId: t.groupId,
				message: " ",
				uploadKey: key,
			}),
		).resolves.toMatchObject({ postId: expect.any(String) });
	});

	it("refuses an empty post, 501 characters and a non-member", async () => {
		const t = await setup();

		await expect(
			t.post({ userId: "bruno", groupId: t.groupId, message: " \n " }),
		).rejects.toThrow(EmptyPostError);
		await expect(
			t.post({ userId: "bruno", groupId: t.groupId, message: "a".repeat(501) }),
		).rejects.toThrow(InvalidPostMessageError);
		await expect(
			t.post({ userId: "carla", groupId: t.groupId, message: "Oi" }),
		).rejects.toThrow(GroupNotFoundError);
		expect((await t.feed("ana")).posts).toEqual([]);
	});

	it("refuses a missing object, an upload of another member or group, or one already used, with GROUP.UPLOAD_NOT_FOUND", async () => {
		const t = await setup();
		const notUploaded = (
			await createRequestGroupUpload(t.deps)({
				userId: "bruno",
				groupId: t.groupId,
				type: "pdf",
				contentType: "application/pdf",
				sizeBytes: 10,
				fileName: "a.pdf",
			})
		).key;
		const anas = await t.upload("ana");
		const otherGroup = await t.upload("bruno", "pdf", t.otherGroupId);

		for (const uploadKey of [
			notUploaded,
			anas,
			otherGroup,
			`groups/${t.groupId}/never.pdf`,
		]) {
			await expect(
				t.post({
					userId: "bruno",
					groupId: t.groupId,
					message: "x",
					uploadKey,
				}),
			).rejects.toThrow(GroupUploadNotFoundError);
		}
		expect((await t.feed("ana")).posts).toEqual([]);
		expect(new GroupUploadNotFoundError().code).toBe("GROUP.UPLOAD_NOT_FOUND");
	});
});
