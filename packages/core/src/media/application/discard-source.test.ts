import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { InMemorySourceUploadRepository } from "../testing/in-memory-source-upload-repository";
import { createDiscardSource, type DiscardSource } from "./discard-source";

const key = "sources/user-1/doc.pdf";

describe("discardSource", () => {
	let storage: InMemoryObjectStorage;
	let sourceUploads: InMemorySourceUploadRepository;
	let discard: DiscardSource;

	beforeEach(async () => {
		storage = new InMemoryObjectStorage();
		sourceUploads = new InMemorySourceUploadRepository();
		discard = createDiscardSource({ storage, sourceUploads });
		storage.simulateUpload(key);
		await sourceUploads.add({
			key,
			ownerId: "user-1",
			createdAt: new Date("2026-10-16T10:00:00.000Z"),
		});
	});

	it("discards the caller's source", async () => {
		await discard({ ownerId: "user-1", key });

		expect(storage.keys()).toEqual([]);
		expect(sourceUploads.keys()).toEqual([]);
	});

	it("ignores another owner's key", async () => {
		await discard({ ownerId: "user-2", key });

		expect(storage.keys()).toEqual([key]);
		expect(sourceUploads.keys()).toEqual([key]);
	});

	it("ignores a key outside the sources", async () => {
		storage.simulateUpload("media/user-1/image.png");

		await discard({ ownerId: "user-1", key: "media/user-1/image.png" });

		expect(storage.keys()).toContain("media/user-1/image.png");
	});

	it("is idempotent", async () => {
		await discard({ ownerId: "user-1", key });

		await expect(discard({ ownerId: "user-1", key })).resolves.toBeUndefined();
	});
});
