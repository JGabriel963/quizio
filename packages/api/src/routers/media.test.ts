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
