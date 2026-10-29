import { beforeEach, describe, expect, it } from "vitest";

import { reserveUpload } from "../../shared/application/upload-limit";
import {
	TooManyUploadsError,
	UPLOAD_LIMIT,
	UPLOAD_WINDOW_MS,
} from "../../shared/domain/upload-limit";
import { FixedClock } from "../../shared/testing/fixed-clock";
import { InMemoryAttemptLimiter } from "../../shared/testing/in-memory-attempt-limiter";
import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { SequentialIdGenerator } from "../../shared/testing/sequential-id-generator";
import {
	InvalidMediaSizeError,
	MAX_MEDIA_BYTES,
	UnsupportedMediaTypeError,
} from "../domain/media-policy";
import { InMemoryMediaUploads } from "../testing/in-memory-media-uploads";
import { MEDIA_UPLOAD_TTL_MS } from "./media-uploads";
import {
	createRequestMediaUpload,
	type RequestMediaUpload,
} from "./request-media-upload";

describe("requestMediaUpload", () => {
	let storage: InMemoryObjectStorage;
	let mediaUploads: InMemoryMediaUploads;
	let attempts: InMemoryAttemptLimiter;
	let clock: FixedClock;
	let requestMediaUpload: RequestMediaUpload;

	beforeEach(() => {
		storage = new InMemoryObjectStorage("https://media.test");
		mediaUploads = new InMemoryMediaUploads();
		attempts = new InMemoryAttemptLimiter();
		clock = new FixedClock();
		requestMediaUpload = createRequestMediaUpload({
			storage,
			ids: new SequentialIdGenerator("media"),
			mediaUploads,
			mediaUsage: mediaUploads,
			attempts,
			clock,
		});
	});

	const anImage = {
		ownerId: "user-42",
		contentType: "image/png",
		sizeBytes: 9,
	};

	it("records the upload, and a later one deletes it a day on if nothing used it (L4)", async () => {
		const unused = await requestMediaUpload(anImage);
		const used = await requestMediaUpload(anImage);
		await storage.put(unused.key, new Uint8Array([1]), "image/png");
		await storage.put(used.key, new Uint8Array([1]), "image/png");
		mediaUploads.use(used.key);
		expect(mediaUploads.keys()).toEqual([unused.key, used.key].sort());

		clock.advanceBy(MEDIA_UPLOAD_TTL_MS + 1);
		const next = await requestMediaUpload(anImage);

		expect(await storage.exists(unused.key)).toBe(false);
		// A file something points at only loses its row.
		expect(await storage.exists(used.key)).toBe(true);
		expect(mediaUploads.keys()).toEqual([next.key]);
	});

	it("takes 200 uploads an hour from a person, then refuses until the hour turns (L4)", async () => {
		for (let upload = 1; upload < UPLOAD_LIMIT; upload++) {
			await reserveUpload({ attempts, clock }, "user-42");
		}
		await requestMediaUpload(anImage);

		await expect(requestMediaUpload(anImage)).rejects.toThrow(
			TooManyUploadsError,
		);
		await expect(
			requestMediaUpload({ ...anImage, ownerId: "user-7" }),
		).resolves.toBeDefined();
		clock.advanceBy(UPLOAD_WINDOW_MS);
		await expect(requestMediaUpload(anImage)).resolves.toBeDefined();
	});

	it("refuses before recording or signing anything", async () => {
		for (let upload = 0; upload < UPLOAD_LIMIT; upload++) {
			await reserveUpload({ attempts, clock }, "user-42");
		}

		await expect(requestMediaUpload(anImage)).rejects.toThrow(
			TooManyUploadsError,
		);
		expect(storage.presignedUploads).toHaveLength(0);
		expect(mediaUploads.keys()).toEqual([]);
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
