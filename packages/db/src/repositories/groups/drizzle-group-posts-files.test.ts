import type { GroupUpload } from "@quizio/core/groups/application/ports/group-upload-repository";
import type { GroupPost } from "@quizio/core/groups/domain/group-post";
import { adminOf, aGroup } from "@quizio/core/groups/testing/a-group";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { user } from "../../schema/auth";
import { groupPost, groupTable, groupUpload } from "../../schema/groups";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleGroupFeedQuery } from "./drizzle-group-feed-query";
import { createDrizzleGroupPostRepository } from "./drizzle-group-post-repository";
import { createDrizzleGroupRepository } from "./drizzle-group-repository";
import { createDrizzleGroupUploadRepository } from "./drizzle-group-upload-repository";

const at = (minute: number) =>
	new Date(`2026-10-26T12:${String(minute).padStart(2, "0")}:00.000Z`);

function aMessage(
	overrides: Partial<Omit<GroupPost, "file">> = {},
): Omit<GroupPost, "file"> {
	return {
		id: "post-1",
		groupId: "g1",
		authorId: "bruno",
		kind: "message",
		message: "Leiam",
		gameId: null,
		sharedQuizId: null,
		createdAt: at(1),
		...overrides,
	};
}

function anUpload(overrides: Partial<GroupUpload> = {}): GroupUpload {
	return {
		key: "groups/g1/a.pdf",
		groupId: "g1",
		uploaderId: "bruno",
		file: { type: "pdf", name: "apostila.pdf", sizeBytes: 2048 },
		createdAt: at(0),
		...overrides,
	};
}

describe("Drizzle group posts with files (spec 036; ADR 0017)", () => {
	let testDb: TestDatabase;
	let groups: ReturnType<typeof createDrizzleGroupRepository>;
	let posts: ReturnType<typeof createDrizzleGroupPostRepository>;
	let feed: ReturnType<typeof createDrizzleGroupFeedQuery>;
	let uploads: ReturnType<typeof createDrizzleGroupUploadRepository>;

	beforeAll(async () => {
		testDb = await createTestDb();
		await testDb.db.insert(user).values([
			{ id: "ana", name: "Ana", email: "ana@quizio.test" },
			{ id: "bruno", name: "Bruno", email: "bruno@quizio.test" },
		]);
		groups = createDrizzleGroupRepository(testDb.db);
		posts = createDrizzleGroupPostRepository(testDb.db);
		feed = createDrizzleGroupFeedQuery(testDb.db);
		uploads = createDrizzleGroupUploadRepository(testDb.db);
	});

	afterAll(() => testDb.close());

	beforeEach(async () => {
		await testDb.db.delete(groupTable);
		for (const id of ["g1", "g2"]) {
			const group = aGroup({ id, adminId: "ana", inviteCode: `code-${id}` });
			await groups.create(group, adminOf(group));
		}
	});

	it("a post's file columns are all set or all null", async () => {
		await expect(
			testDb.db.insert(groupPost).values({
				...aMessage(),
				fileType: "pdf",
				fileKey: "groups/g1/a.pdf",
				fileName: null,
				fileSizeBytes: null,
			}),
		).rejects.toThrow();
		await posts.createPost({ ...aMessage(), file: null });
		expect(await posts.findPost("g1", "post-1")).toEqual({
			...aMessage(),
			file: null,
		});
	});

	it("createMessageFromUpload consumes the upload and inserts the post in one transaction", async () => {
		await uploads.addUpload(anUpload());

		expect(
			await posts.createMessageFromUpload(aMessage(), {
				key: "groups/g1/a.pdf",
				uploaderId: "bruno",
			}),
		).toBe("created");

		expect(await posts.findPost("g1", "post-1")).toEqual({
			...aMessage(),
			file: {
				type: "pdf",
				key: "groups/g1/a.pdf",
				name: "apostila.pdf",
				sizeBytes: 2048,
			},
		});
		expect(await testDb.db.select().from(groupUpload)).toEqual([]);
	});

	it("two publishes of one upload leave one post", async () => {
		await uploads.addUpload(anUpload());

		const results = await Promise.all([
			posts.createMessageFromUpload(aMessage({ id: "a" }), {
				key: "groups/g1/a.pdf",
				uploaderId: "bruno",
			}),
			posts.createMessageFromUpload(aMessage({ id: "b" }), {
				key: "groups/g1/a.pdf",
				uploaderId: "bruno",
			}),
		]);

		expect([...results].sort()).toEqual(["created", "missing"]);
		expect(await testDb.db.select().from(groupPost)).toHaveLength(1);
	});

	it("an upload of another user or group is missing", async () => {
		await uploads.addUpload(anUpload());

		expect(
			await posts.createMessageFromUpload(aMessage(), {
				key: "groups/g1/a.pdf",
				uploaderId: "ana",
			}),
		).toBe("missing");
		expect(
			await posts.createMessageFromUpload(aMessage({ groupId: "g2" }), {
				key: "groups/g1/a.pdf",
				uploaderId: "bruno",
			}),
		).toBe("missing");
		expect(await testDb.db.select().from(groupPost)).toEqual([]);
	});

	it("deletePost returns the deleted post; fileKeysOfGroup lists the posted files", async () => {
		await uploads.addUpload(anUpload());
		await posts.createMessageFromUpload(aMessage(), {
			key: "groups/g1/a.pdf",
			uploaderId: "bruno",
		});
		await posts.createPost({ ...aMessage({ id: "post-2" }), file: null });

		expect(await posts.fileKeysOfGroup("g1")).toEqual(["groups/g1/a.pdf"]);
		expect(await posts.fileKeysOfGroup("g2")).toEqual([]);
		expect(await posts.deletePost("post-1")).toMatchObject({
			id: "post-1",
			file: { key: "groups/g1/a.pdf" },
		});
		expect(await posts.deletePost("post-1")).toBeNull();
	});

	it("listPosts pages by (created_at, id), newest first; message posts come with their file", async () => {
		await uploads.addUpload(anUpload());
		await posts.createMessageFromUpload(
			aMessage({ id: "p-file", createdAt: at(9) }),
			{ key: "groups/g1/a.pdf", uploaderId: "bruno" },
		);
		// Two at the same instant: the id breaks the tie.
		for (const id of ["p-a", "p-b"]) {
			await posts.createPost({
				...aMessage({ id, createdAt: at(5) }),
				file: null,
			});
		}
		await posts.createPost({
			...aMessage({ id: "p-old", createdAt: at(1) }),
			file: null,
		});

		const first = await feed.listPosts("g1", "ana", { limit: 2, after: null });
		expect(first.map((post) => post.id)).toEqual(["p-file", "p-b"]);
		expect(first[0]).toMatchObject({
			authorName: "Bruno",
			file: { type: "pdf", name: "apostila.pdf", sizeBytes: 2048 },
		});
		const last = first[1];
		const second = await feed.listPosts("g1", "ana", {
			limit: 2,
			after: { createdAt: at(5), id: last?.id ?? "" },
		});
		expect(second.map((post) => post.id)).toEqual(["p-a", "p-old"]);
		expect((await feed.listPosts("g1", "ana")).map((post) => post.id)).toEqual([
			"p-file",
			"p-b",
			"p-a",
			"p-old",
		]);
	});
});

describe("Drizzle group uploads (spec 036, RN-21)", () => {
	let testDb: TestDatabase;
	let uploads: ReturnType<typeof createDrizzleGroupUploadRepository>;

	beforeAll(async () => {
		testDb = await createTestDb();
		await testDb.db
			.insert(user)
			.values([{ id: "bruno", name: "Bruno", email: "bruno@quizio.test" }]);
		const groups = createDrizzleGroupRepository(testDb.db);
		for (const id of ["g1", "g2"]) {
			const group = aGroup({ id, adminId: "bruno", inviteCode: `code-${id}` });
			await groups.create(group, adminOf(group));
		}
		uploads = createDrizzleGroupUploadRepository(testDb.db);
	});

	afterAll(() => testDb.close());

	beforeEach(async () => {
		await testDb.db.delete(groupUpload);
	});

	const keys = async () =>
		(await testDb.db.select().from(groupUpload)).map(({ key }) => key).sort();

	it("add and remove one's own upload", async () => {
		await uploads.addUpload(anUpload());

		expect(await uploads.removeUpload("groups/g1/a.pdf", "ana")).toBe(false);
		expect(await keys()).toEqual(["groups/g1/a.pdf"]);
		expect(await uploads.removeUpload("groups/g1/a.pdf", "bruno")).toBe(true);
		expect(await uploads.removeUpload("groups/g1/a.pdf", "bruno")).toBe(false);
		expect(await keys()).toEqual([]);
	});

	it("takeExpired returns and removes old uploads only, up to the limit", async () => {
		await uploads.addUpload(
			anUpload({ key: "groups/g1/old.pdf", createdAt: at(1) }),
		);
		await uploads.addUpload(
			anUpload({ key: "groups/g2/older.pdf", groupId: "g2", createdAt: at(0) }),
		);
		await uploads.addUpload(
			anUpload({ key: "groups/g1/new.pdf", createdAt: at(9) }),
		);

		expect(await uploads.takeExpiredUploads(at(5), 1)).toEqual([
			"groups/g2/older.pdf",
		]);
		expect(await uploads.takeExpiredUploads(at(5), 10)).toEqual([
			"groups/g1/old.pdf",
		]);
		expect(await keys()).toEqual(["groups/g1/new.pdf"]);
	});

	it("keysOfGroup", async () => {
		await uploads.addUpload(anUpload({ key: "groups/g1/a.pdf" }));
		await uploads.addUpload(
			anUpload({ key: "groups/g2/b.pdf", groupId: "g2" }),
		);

		expect(await uploads.uploadKeysOfGroup("g1")).toEqual(["groups/g1/a.pdf"]);
	});
});
