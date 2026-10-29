import { describe, expect, it } from "vitest";
import { reserveUpload } from "../../shared/application/upload-limit";
import {
	TooManyUploadsError,
	UPLOAD_LIMIT,
} from "../../shared/domain/upload-limit";
import {
	GroupNotFoundError,
	InvalidGroupFileSizeError,
	UnsupportedGroupFileError,
} from "../domain/group-errors";
import { groupsTestDeps } from "../testing/groups-test-deps";
import { createDiscardGroupUpload } from "./discard-group-upload";
import { createRequestGroupUpload } from "./request-group-upload";

const MB = 1024 * 1024;
const DAY = 24 * 60 * 60 * 1000;

async function setup() {
	const t = groupsTestDeps();
	const groupId = await t.aGroupOf("ana", ["bruno"]);
	const request = createRequestGroupUpload(t.deps);
	const pdf = (userId = "bruno", fileName = "apostila.pdf") =>
		request({
			userId,
			groupId,
			type: "pdf",
			contentType: "application/pdf",
			sizeBytes: 2 * MB,
			fileName,
		});
	return { ...t, groupId, request, pdf };
}

describe("requestGroupUpload (spec 036, RN-09, RN-11, RN-21; ADR 0017)", () => {
	it("a member gets a presigned upload under groups/{groupId}/ with the file name as Content-Disposition", async () => {
		const t = await setup();

		const upload = await t.pdf("bruno", "Apostila de história.pdf");

		expect(upload.key).toMatch(new RegExp(`^groups/${t.groupId}/[^/]+\\.pdf$`));
		expect(upload.method).toBe("PUT");
		expect(t.deps.storage.presignedUploads.at(-1)).toMatchObject({
			key: upload.key,
			contentType: "application/pdf",
			contentLength: 2 * MB,
			contentDisposition:
				"inline; filename*=UTF-8''Apostila%20de%20hist%C3%B3ria.pdf",
		});
	});

	it("records the pending upload", async () => {
		const t = await setup();

		const upload = await t.pdf();

		expect(await t.store.findUpload(upload.key)).toEqual({
			key: upload.key,
			groupId: t.groupId,
			uploaderId: "bruno",
			file: { type: "pdf", name: "apostila.pdf", sizeBytes: 2 * MB },
			createdAt: t.clock.now(),
		});
	});

	it("sweeps up to 20 uploads older than 24 hours and deletes their objects", async () => {
		const t = await setup();
		const old = [];
		for (let index = 0; index < 22; index++) {
			const upload = await t.pdf();
			t.deps.storage.simulateUpload(upload.key);
			old.push(upload.key);
		}
		t.clock.advanceBy(DAY + 1);

		const fresh = await t.pdf();

		const left = old.filter((key) => t.deps.storage.keys().includes(key));
		expect(left).toHaveLength(2);
		expect(await t.store.findUpload(fresh.key)).not.toBeNull();
		for (const key of old.filter((key) => !left.includes(key))) {
			expect(await t.store.findUpload(key)).toBeNull();
		}
	});

	it("a non-member gets GROUP.NOT_FOUND", async () => {
		const t = await setup();

		await expect(t.pdf("carla")).rejects.toThrow(GroupNotFoundError);
	});

	it("refuses a wrong type or size before signing", async () => {
		const t = await setup();

		await expect(
			t.request({
				userId: "bruno",
				groupId: t.groupId,
				type: "image",
				contentType: "text/plain",
				sizeBytes: 10,
				fileName: "a.txt",
			}),
		).rejects.toThrow(UnsupportedGroupFileError);
		await expect(
			t.request({
				userId: "bruno",
				groupId: t.groupId,
				type: "image",
				contentType: "image/png",
				sizeBytes: 11 * MB,
				fileName: "a.png",
			}),
		).rejects.toThrow(InvalidGroupFileSizeError);
		expect(t.deps.storage.presignedUploads).toHaveLength(0);
	});
});

describe("discardGroupUpload (spec 036, RN-08)", () => {
	it("removes the row and the object of one's own upload", async () => {
		const t = await setup();
		const upload = await t.pdf();
		t.deps.storage.simulateUpload(upload.key);

		await createDiscardGroupUpload(t.deps)({
			userId: "bruno",
			groupId: t.groupId,
			key: upload.key,
		});

		expect(await t.store.findUpload(upload.key)).toBeNull();
		expect(t.deps.storage.keys()).not.toContain(upload.key);
	});

	it("is idempotent", async () => {
		const t = await setup();
		const discard = createDiscardGroupUpload(t.deps);

		await expect(
			discard({ userId: "bruno", groupId: t.groupId, key: "groups/x/y.pdf" }),
		).resolves.toBeUndefined();
	});

	it("ignores someone else's upload", async () => {
		const t = await setup();
		const upload = await t.pdf("bruno");
		t.deps.storage.simulateUpload(upload.key);

		await createDiscardGroupUpload(t.deps)({
			userId: "ana",
			groupId: t.groupId,
			key: upload.key,
		});

		expect(await t.store.findUpload(upload.key)).not.toBeNull();
		expect(t.deps.storage.keys()).toContain(upload.key);
	});
});

describe("requestGroupUpload limit (audit L4)", () => {
	it("counts against the person's uploads of the hour", async () => {
		const t = await setup();
		for (let upload = 0; upload < UPLOAD_LIMIT; upload++) {
			await reserveUpload(t.deps, "bruno");
		}

		await expect(t.pdf("bruno")).rejects.toThrow(TooManyUploadsError);
	});
});
