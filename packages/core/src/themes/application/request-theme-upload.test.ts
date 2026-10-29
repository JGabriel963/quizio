import { describe, expect, it } from "vitest";

import {
	InvalidMediaSizeError,
	UnsupportedMediaTypeError,
} from "../../media/domain/media-policy";
import { reserveUpload } from "../../shared/application/upload-limit";
import {
	TooManyUploadsError,
	UPLOAD_LIMIT,
} from "../../shared/domain/upload-limit";
import { themesTestDeps } from "../testing/themes-test-deps";
import { createDiscardThemeUpload } from "./discard-theme-upload";
import { createRequestThemeUpload } from "./request-theme-upload";

const MB = 1024 * 1024;
const DAY = 24 * 60 * 60 * 1000;

describe("requestThemeUpload (spec 043, RN-07, RN-29)", () => {
	it("records a pending upload under themes/{owner}/ and signs the PUT", async () => {
		const t = themesTestDeps();
		const request = createRequestThemeUpload(t.deps);

		const upload = await request({
			ownerId: "owner-1",
			contentType: "image/png",
			sizeBytes: 2 * MB,
		});

		expect(upload.key).toMatch(/^themes\/owner-1\/[^/]+\.png$/);
		expect(upload.method).toBe("PUT");
		expect(t.storage.presignedUploads.at(-1)).toMatchObject({
			key: upload.key,
			contentType: "image/png",
			contentLength: 2 * MB,
		});
		expect(t.store.pendingUploadKeys()).toEqual([upload.key]);
	});

	it("refuses another type or more than 10 MB", async () => {
		const t = themesTestDeps();
		const request = createRequestThemeUpload(t.deps);

		await expect(
			request({
				ownerId: "owner-1",
				contentType: "application/pdf",
				sizeBytes: MB,
			}),
		).rejects.toThrow(UnsupportedMediaTypeError);
		await expect(
			request({
				ownerId: "owner-1",
				contentType: "image/jpeg",
				sizeBytes: 12 * MB,
			}),
		).rejects.toThrow(InvalidMediaSizeError);
		expect(t.store.pendingUploadKeys()).toEqual([]);
	});

	it("sweeps the uploads older than 24 h and deletes their files", async () => {
		const t = themesTestDeps();
		const stale = await t.uploaded("themes/owner-2/stale.png", "owner-2");
		t.clock.advanceBy(DAY + 1);
		const request = createRequestThemeUpload(t.deps);

		const upload = await request({
			ownerId: "owner-1",
			contentType: "image/webp",
			sizeBytes: MB,
		});

		expect(t.store.pendingUploadKeys()).toEqual([upload.key]);
		expect(await t.storage.exists(stale)).toBe(false);
	});

	it("an expired file a game copied stays (RN-28)", async () => {
		const t = themesTestDeps();
		const copied = await t.uploaded("themes/owner-2/copied.png", "owner-2");
		t.fileUsage.copiedByAGame(copied);
		t.clock.advanceBy(DAY + 1);

		await createRequestThemeUpload(t.deps)({
			ownerId: "owner-1",
			contentType: "image/png",
			sizeBytes: MB,
		});

		expect(await t.storage.exists(copied)).toBe(true);
		expect(t.store.pendingUploadKeys()).not.toContain(copied);
	});
});

describe("discardThemeUpload (spec 043, CA-10)", () => {
	it("removes the owner's pending upload and its file", async () => {
		const t = themesTestDeps();
		const key = await t.uploaded("themes/owner-1/a.png");

		await createDiscardThemeUpload(t.deps)({ ownerId: "owner-1", key });

		expect(t.store.pendingUploadKeys()).toEqual([]);
		expect(await t.storage.exists(key)).toBe(false);
	});

	it("keeps a file a game copied, released by the theme but still the owner's (RN-28)", async () => {
		const t = themesTestDeps();
		const key = await t.uploaded("themes/owner-1/a.png");
		t.fileUsage.copiedByAGame(key);

		await createDiscardThemeUpload(t.deps)({ ownerId: "owner-1", key });

		expect(t.store.pendingUploadKeys()).toEqual([]);
		expect(await t.storage.exists(key)).toBe(true);
	});

	it("ignores someone else's key", async () => {
		const t = themesTestDeps();
		const key = await t.uploaded("themes/owner-1/a.png");

		await createDiscardThemeUpload(t.deps)({ ownerId: "owner-2", key });

		expect(t.store.pendingUploadKeys()).toEqual([key]);
		expect(await t.storage.exists(key)).toBe(true);
	});
});

describe("requestThemeUpload limit (audit L4)", () => {
	it("counts against the person's uploads of the hour", async () => {
		const t = themesTestDeps();
		for (let upload = 0; upload < UPLOAD_LIMIT; upload++) {
			await reserveUpload(t.deps, "owner-1");
		}

		await expect(
			createRequestThemeUpload(t.deps)({
				ownerId: "owner-1",
				contentType: "image/png",
				sizeBytes: 1000,
			}),
		).rejects.toThrow(TooManyUploadsError);
	});
});
