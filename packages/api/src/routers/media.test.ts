import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";

import { createTestApi } from "../testing/test-context";

describe("media.requestUpload", () => {
	it("returns a presigned upload scoped to the signed-in user", async () => {
		const caller = createTestApi().callerFor("user-1");

		const upload = await caller.media.requestUpload({
			contentType: "image/webp",
			sizeBytes: 1000,
		});

		expect(upload).toMatchObject({
			key: "media/user-1/id-1.webp",
			method: "PUT",
			publicUrl: "https://media.test/media/user-1/id-1.webp",
		});
	});

	it("requires authentication", async () => {
		const { callerFor, storage } = createTestApi();

		await expect(
			callerFor(null).media.requestUpload({
				contentType: "image/png",
				sizeBytes: 1000,
			}),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
		expect(storage.presignedUploads).toHaveLength(0);
	});

	it("maps media policy violations to BAD_REQUEST with the domain error as cause", async () => {
		const caller = createTestApi().callerFor("user-1");

		const error = await caller.media
			.requestUpload({ contentType: "application/pdf", sizeBytes: 1000 })
			.catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(TRPCError);
		expect(error).toMatchObject({
			code: "BAD_REQUEST",
			cause: { code: "MEDIA.UNSUPPORTED_TYPE" },
		});
	});
});

describe("media source documents (spec 027)", () => {
	it("requests a PDF upload under the caller's sources", async () => {
		const { callerFor, sourceUploads } = createTestApi();

		const upload = await callerFor("user-1").media.requestSourceUpload({
			contentType: "application/pdf",
			sizeBytes: 2048,
		});

		expect(upload).toMatchObject({
			key: "sources/user-1/id-1.pdf",
			method: "PUT",
		});
		expect(sourceUploads.keys()).toEqual(["sources/user-1/id-1.pdf"]);
	});

	it("refuses an image as source", async () => {
		const caller = createTestApi().callerFor("user-1");

		await expect(
			caller.media.requestSourceUpload({
				contentType: "image/png",
				sizeBytes: 2048,
			}),
		).rejects.toMatchObject({
			code: "BAD_REQUEST",
			cause: { code: "MEDIA.UNSUPPORTED_SOURCE_TYPE" },
		});
	});

	it("discards the caller's source", async () => {
		const { callerFor, storage, sourceUploads } = createTestApi();
		const caller = callerFor("user-1");
		const { key } = await caller.media.requestSourceUpload({
			contentType: "application/pdf",
			sizeBytes: 2048,
		});
		storage.simulateUpload(key);

		await caller.media.discardSource({ key });

		expect(storage.keys()).toEqual([]);
		expect(sourceUploads.keys()).toEqual([]);
	});

	it("requires authentication", async () => {
		await expect(
			createTestApi().callerFor(null).media.discardSource({ key: "x" }),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
	});
});
