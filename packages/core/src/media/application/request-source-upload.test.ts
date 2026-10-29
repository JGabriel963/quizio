import { beforeEach, describe, expect, it } from "vitest";

import { reserveUpload } from "../../shared/application/upload-limit";
import {
	TooManyUploadsError,
	UPLOAD_LIMIT,
} from "../../shared/domain/upload-limit";
import { FixedClock } from "../../shared/testing/fixed-clock";
import { InMemoryAttemptLimiter } from "../../shared/testing/in-memory-attempt-limiter";
import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { SequentialIdGenerator } from "../../shared/testing/sequential-id-generator";
import {
	InvalidSourceSizeError,
	SOURCE_MAX_BYTES,
	UnsupportedSourceTypeError,
} from "../domain/source-policy";
import { InMemorySourceUploadRepository } from "../testing/in-memory-source-upload-repository";
import {
	createRequestSourceUpload,
	type RequestSourceUpload,
} from "./request-source-upload";

const HOUR = 60 * 60 * 1000;

describe("requestSourceUpload", () => {
	let storage: InMemoryObjectStorage;
	let sourceUploads: InMemorySourceUploadRepository;
	let clock: FixedClock;
	let attempts: InMemoryAttemptLimiter;
	let request: RequestSourceUpload;

	beforeEach(() => {
		storage = new InMemoryObjectStorage();
		sourceUploads = new InMemorySourceUploadRepository();
		clock = new FixedClock("2026-10-16T10:00:00.000Z");
		attempts = new InMemoryAttemptLimiter();
		request = createRequestSourceUpload({
			storage,
			sourceUploads,
			ids: new SequentialIdGenerator("doc"),
			clock,
			attempts,
		});
	});

	it("counts against the person's uploads of the hour (L4)", async () => {
		for (let upload = 0; upload < UPLOAD_LIMIT; upload++) {
			await reserveUpload({ attempts, clock }, "user-1");
		}

		await expect(
			request({
				ownerId: "user-1",
				contentType: "application/pdf",
				sizeBytes: 1000,
			}),
		).rejects.toThrow(TooManyUploadsError);
		expect(storage.presignedUploads).toHaveLength(0);
	});

	it("returns a presigned PUT under the caller's sources", async () => {
		const upload = await request({
			ownerId: "user-1",
			contentType: "application/pdf",
			sizeBytes: 1024,
		});

		expect(upload).toEqual({
			key: "sources/user-1/doc-1.pdf",
			uploadUrl: "https://media.test/upload/sources/user-1/doc-1.pdf",
			method: "PUT",
			headers: { "content-type": "application/pdf" },
		});
		expect(storage.presignedUploads[0]).toMatchObject({
			contentType: "application/pdf",
			contentLength: 1024,
		});
	});

	it("refuses non-PDF and files over 20 MB", async () => {
		await expect(
			request({ ownerId: "user-1", contentType: "image/png", sizeBytes: 10 }),
		).rejects.toThrow(UnsupportedSourceTypeError);
		await expect(
			request({
				ownerId: "user-1",
				contentType: "application/pdf",
				sizeBytes: SOURCE_MAX_BYTES + 1,
			}),
		).rejects.toThrow(InvalidSourceSizeError);
		expect(sourceUploads.keys()).toEqual([]);
	});

	it("records the upload", async () => {
		await request({
			ownerId: "user-1",
			contentType: "application/pdf",
			sizeBytes: 10,
		});

		expect(sourceUploads.keys()).toEqual(["sources/user-1/doc-1.pdf"]);
	});

	it("sweeps sources older than 24 hours before a new upload", async () => {
		await sourceUploads.add({
			key: "sources/user-2/old.pdf",
			ownerId: "user-2",
			createdAt: new Date(clock.now().getTime() - 25 * HOUR),
		});
		await sourceUploads.add({
			key: "sources/user-2/recent.pdf",
			ownerId: "user-2",
			createdAt: new Date(clock.now().getTime() - 23 * HOUR),
		});
		storage.simulateUpload("sources/user-2/old.pdf");
		storage.simulateUpload("sources/user-2/recent.pdf");

		await request({
			ownerId: "user-1",
			contentType: "application/pdf",
			sizeBytes: 10,
		});

		expect(storage.keys()).toEqual(["sources/user-2/recent.pdf"]);
		expect(sourceUploads.keys()).toEqual([
			"sources/user-1/doc-1.pdf",
			"sources/user-2/recent.pdf",
		]);
	});
});
