import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { SequentialIdGenerator } from "../../shared/testing/sequential-id-generator";
import {
	InvalidMediaSizeError,
	MAX_MEDIA_BYTES,
	UnsupportedMediaTypeError,
} from "../domain/media-policy";
import {
	createRequestMediaUpload,
	type RequestMediaUpload,
} from "./request-media-upload";

describe("requestMediaUpload", () => {
	let storage: InMemoryObjectStorage;
	let requestMediaUpload: RequestMediaUpload;

	beforeEach(() => {
		storage = new InMemoryObjectStorage("https://media.test");
		requestMediaUpload = createRequestMediaUpload({
			storage,
			ids: new SequentialIdGenerator("media"),
		});
	});

	it("namespaces the object key by owner and derives the extension from the content type", async () => {
		const upload = await requestMediaUpload({
			ownerId: "user-42",
			contentType: "image/png",
			sizeBytes: 2048,
		});

		expect(upload.key).toBe("media/user-42/media-1.png");
		expect(upload.publicUrl).toBe(
			"https://media.test/media/user-42/media-1.png",
		);
		expect(upload.method).toBe("PUT");
	});

	it("asks storage to sign the exact content type and size", async () => {
		await requestMediaUpload({
			ownerId: "user-42",
			contentType: "image/jpeg",
			sizeBytes: 512,
		});

		expect(storage.presignedUploads).toEqual([
			{
				key: "media/user-42/media-1.jpg",
				contentType: "image/jpeg",
				contentLength: 512,
				expiresInSeconds: 300,
			},
		]);
	});

	it("rejects content types outside the media policy", async () => {
		await expect(
			requestMediaUpload({
				ownerId: "user-42",
				contentType: "image/svg+xml",
				sizeBytes: 10,
			}),
		).rejects.toThrow(UnsupportedMediaTypeError);
		expect(storage.presignedUploads).toHaveLength(0);
	});

	it.each([0, -1, 1.5, MAX_MEDIA_BYTES + 1])(
		"rejects a size of %s bytes",
		async (sizeBytes) => {
			await expect(
				requestMediaUpload({
					ownerId: "user-42",
					contentType: "image/png",
					sizeBytes,
				}),
			).rejects.toThrow(InvalidMediaSizeError);
		},
	);
});
