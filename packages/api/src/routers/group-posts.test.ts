import { describe, expect, it } from "vitest";

import { createTestApi } from "../testing/test-context";

const domainCode = (error: unknown) =>
	(error as { cause?: { code?: string } }).cause?.code;
const trpcCode = (error: unknown) => (error as { code?: string }).code;

/** Ana's group with Bruno in it. */
async function setup() {
	const api = createTestApi();
	for (const [id, name] of [
		["ana", "Ana"],
		["bruno", "Bruno"],
		["carla", "Carla"],
	] as const) {
		api.groups.addUser({ id, name, email: `${id}@exemplo.com` });
	}
	const ana = api.callerFor("ana");
	const bruno = api.callerFor("bruno");
	const carla = api.callerFor("carla");
	const { groupId } = await ana.group.create({ name: "Turma 7A" });
	const { code } = await ana.group.invite.get({ groupId });
	await bruno.group.invite.accept({ code });
	return { api, ana, bruno, carla, groupId };
}

describe("group posts (spec 036)", () => {
	it("group.post creates a message post and the setup step is done", async () => {
		const { ana, bruno, groupId } = await setup();

		await bruno.group.post({ groupId, message: "Prova na sexta" });

		const { posts, nextCursor } = await ana.group.feed({ groupId });
		expect(posts).toEqual([
			expect.objectContaining({
				headline: "message",
				author: { userId: "bruno", name: "Bruno", photoUrl: null },
				message: "Prova na sexta",
				file: null,
				canDelete: true,
				canSeeReport: false,
			}),
		]);
		expect(nextCursor).toBeNull();
		expect((await ana.group.get({ groupId })).setup).toMatchObject({
			posted: true,
		});
	});

	it("group.requestUpload signs an upload for a member; group.post with it shows the file in the feed", async () => {
		const { api, ana, bruno, groupId } = await setup();

		const upload = await bruno.group.requestUpload({
			groupId,
			type: "pdf",
			contentType: "application/pdf",
			sizeBytes: 2048,
			fileName: "apostila.pdf",
		});
		expect(upload.key).toMatch(new RegExp(`^groups/${groupId}/`));
		api.storage.simulateUpload(upload.key);
		await bruno.group.post({ groupId, message: "", uploadKey: upload.key });

		const [post] = (await ana.group.feed({ groupId })).posts;
		expect(post).toMatchObject({
			headline: "file",
			message: null,
			file: {
				type: "pdf",
				url: `https://media.test/${upload.key}`,
				name: "apostila.pdf",
				sizeBytes: 2048,
			},
		});
	});

	it("group.discardUpload deletes the pending file", async () => {
		const { api, bruno, groupId } = await setup();
		const { key } = await bruno.group.requestUpload({
			groupId,
			type: "image",
			contentType: "image/png",
			sizeBytes: 10,
			fileName: "a.png",
		});
		api.storage.simulateUpload(key);

		await bruno.group.discardUpload({ groupId, key });

		expect(api.storage.keys()).not.toContain(key);
		const refused = await bruno.group
			.post({ groupId, message: "", uploadKey: key })
			.catch((error) => error);
		expect(domainCode(refused)).toBe("GROUP.UPLOAD_NOT_FOUND");
	});

	it("refuses an empty post, a wrong file and a non-member", async () => {
		const { bruno, carla, groupId } = await setup();

		expect(
			domainCode(
				await bruno.group.post({ groupId, message: " " }).catch((e) => e),
			),
		).toBe("GROUP.EMPTY_POST");
		expect(
			domainCode(
				await bruno.group
					.requestUpload({
						groupId,
						type: "image",
						contentType: "text/plain",
						sizeBytes: 10,
						fileName: "a.txt",
					})
					.catch((e) => e),
			),
		).toBe("GROUP.UNSUPPORTED_FILE");
		expect(
			trpcCode(
				await carla.group.post({ groupId, message: "Oi" }).catch((e) => e),
			),
		).toBe("NOT_FOUND");
	});

	it("group.feed pages with a cursor", async () => {
		const { api, ana, groupId } = await setup();
		for (let index = 0; index < 21; index++) {
			await ana.group.post({ groupId, message: `#${index}` });
			api.clock.advanceBy(3000);
		}

		const first = await ana.group.feed({ groupId });
		expect(first.posts).toHaveLength(20);
		expect(first.posts[0]?.message).toBe("#20");
		const cursor = first.nextCursor;
		if (!cursor) {
			throw new Error("expected a next page");
		}
		const second = await ana.group.feed({ groupId, cursor });
		expect(second.posts.map((post) => post.message)).toEqual(["#0"]);
		expect(second.nextCursor).toBeNull();
	});
});

describe("the post's own page (spec 040, RN-19)", () => {
	it("posts.get returns a member's post", async () => {
		const { ana, bruno, groupId } = await setup();
		const { postId } = await bruno.group.post({ groupId, message: "Oi" });

		expect(await ana.group.posts.get({ groupId, postId })).toMatchObject({
			id: postId,
			message: "Oi",
			author: { userId: "bruno", name: "Bruno", photoUrl: null },
		});
	});

	it("posts.get is NOT_FOUND outside the group and after deletion", async () => {
		const { ana, bruno, carla, groupId } = await setup();
		const { postId } = await bruno.group.post({ groupId, message: "Oi" });

		await expect(
			carla.group.posts.get({ groupId, postId }),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
		await bruno.group.posts.delete({ groupId, postId });
		await expect(
			ana.group.posts.get({ groupId, postId }),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});
});
