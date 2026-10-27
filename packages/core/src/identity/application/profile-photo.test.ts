import { beforeEach, describe, expect, it } from "vitest";

import {
	InvalidMediaSizeError,
	MAX_MEDIA_BYTES,
	UnsupportedMediaTypeError,
} from "../../media/domain/media-policy";
import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { InMemoryProfilePhotoRepository } from "../../shared/testing/in-memory-profile-photo-repository";
import { SequentialIdGenerator } from "../../shared/testing/sequential-id-generator";
import { InvalidProfilePhotoError } from "../domain/account-errors";
import { createRemoveProfilePhoto } from "./remove-profile-photo";
import { createRequestProfilePhotoUpload } from "./request-profile-photo-upload";
import { createSetProfilePhoto } from "./set-profile-photo";

describe("profile photo", () => {
	let storage: InMemoryObjectStorage;
	let photos: InMemoryProfilePhotoRepository;
	const deps = () => ({
		storage,
		profilePhotos: photos,
		ids: new SequentialIdGenerator("photo"),
	});

	beforeEach(() => {
		storage = new InMemoryObjectStorage();
		photos = new InMemoryProfilePhotoRepository();
	});

	it("requestProfilePhotoUpload presigns a key under profiles/{userId}/", async () => {
		const upload = await createRequestProfilePhotoUpload(deps())({
			userId: "user-1",
			contentType: "image/webp",
			sizeBytes: 40_000,
		});

		expect(upload.key).toBe("profiles/user-1/photo-1.webp");
		expect(upload.method).toBe("PUT");
		expect(storage.presignedUploads).toEqual([
			expect.objectContaining({
				key: "profiles/user-1/photo-1.webp",
				contentType: "image/webp",
				contentLength: 40_000,
			}),
		]);
	});

	it("requestProfilePhotoUpload refuses a PDF and 11 MB", async () => {
		const request = createRequestProfilePhotoUpload(deps());

		await expect(
			request({
				userId: "user-1",
				contentType: "application/pdf",
				sizeBytes: 1000,
			}),
		).rejects.toThrow(UnsupportedMediaTypeError);
		await expect(
			request({
				userId: "user-1",
				contentType: "image/jpeg",
				sizeBytes: MAX_MEDIA_BYTES + 1024 * 1024,
			}),
		).rejects.toThrow(InvalidMediaSizeError);
	});

	it("setProfilePhoto refuses another user's key and a missing file", async () => {
		const set = createSetProfilePhoto(deps());
		storage.simulateUpload("profiles/user-2/a.webp");

		await expect(
			set({ userId: "user-1", key: "profiles/user-2/a.webp" }),
		).rejects.toThrow(InvalidProfilePhotoError);
		await expect(
			set({ userId: "user-1", key: "media/user-1/a.webp" }),
		).rejects.toThrow(InvalidProfilePhotoError);
		await expect(
			set({ userId: "user-1", key: "profiles/user-1/missing.webp" }),
		).rejects.toThrow(InvalidProfilePhotoError);
		expect(await photos.keyOf("user-1")).toBeNull();
	});

	it("setProfilePhoto deletes the previous file", async () => {
		const set = createSetProfilePhoto(deps());
		storage.simulateUpload("profiles/user-1/a.webp");
		storage.simulateUpload("profiles/user-1/b.webp");

		await set({ userId: "user-1", key: "profiles/user-1/a.webp" });
		const result = await set({
			userId: "user-1",
			key: "profiles/user-1/b.webp",
		});

		expect(result).toEqual({
			photoUrl: "https://media.test/profiles/user-1/b.webp",
		});
		expect(await photos.keyOf("user-1")).toBe("profiles/user-1/b.webp");
		expect(storage.keys()).toEqual(["profiles/user-1/b.webp"]);
	});

	it("removeProfilePhoto deletes the file and returns no photo", async () => {
		storage.simulateUpload("profiles/user-1/a.webp");
		await createSetProfilePhoto(deps())({
			userId: "user-1",
			key: "profiles/user-1/a.webp",
		});

		const result = await createRemoveProfilePhoto(deps())({ userId: "user-1" });

		expect(result).toEqual({ photoUrl: null });
		expect(await photos.keyOf("user-1")).toBeNull();
		expect(storage.keys()).toEqual([]);
	});
});
