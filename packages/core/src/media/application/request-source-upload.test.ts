import { beforeEach, describe, expect, it } from "vitest";

import { FixedClock } from "../../shared/testing/fixed-clock";
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
	let request: RequestSourceUpload;

	beforeEach(() => {
		storage = new InMemoryObjectStorage();
		sourceUploads = new InMemorySourceUploadRepository();
		clock = new FixedClock("2026-10-16T10:00:00.000Z");
		request = createRequestSourceUpload({
			storage,
			sourceUploads,
			ids: new SequentialIdGenerator("doc"),
			clock,
		});
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
