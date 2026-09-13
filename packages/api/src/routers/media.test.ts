import { FixedClock } from "@quizio/core/shared/testing/fixed-clock";
import { InMemoryObjectStorage } from "@quizio/core/shared/testing/in-memory-object-storage";
import { InMemoryRealtimePublisher } from "@quizio/core/shared/testing/in-memory-realtime-publisher";
import { SequentialIdGenerator } from "@quizio/core/shared/testing/sequential-id-generator";
import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";

import { createContainer } from "../container";
import type { Context } from "../context";
import { createCallerFactory } from "../index";
import { appRouter } from "./index";

const createCaller = createCallerFactory(appRouter);

function setup({ signedIn }: { signedIn: boolean }) {
	const storage = new InMemoryObjectStorage("https://media.test");
	const container = createContainer({
		storage,
		realtime: new InMemoryRealtimePublisher(),
		ids: new SequentialIdGenerator("media"),
		clock: new FixedClock(),
	});
	const session = signedIn
		? ({ user: { id: "user-1" }, session: { id: "session-1" } } as NonNullable<
				Context["session"]
			>)
		: null;
	return { storage, caller: createCaller({ session, container }) };
}

describe("media.requestUpload", () => {
	it("returns a presigned upload scoped to the signed-in user", async () => {
		const { caller } = setup({ signedIn: true });

		const upload = await caller.media.requestUpload({
			contentType: "image/webp",
			sizeBytes: 1000,
		});

		expect(upload).toMatchObject({
			key: "media/user-1/media-1.webp",
			method: "PUT",
			publicUrl: "https://media.test/media/user-1/media-1.webp",
		});
	});

	it("requires authentication", async () => {
		const { caller, storage } = setup({ signedIn: false });

		await expect(
			caller.media.requestUpload({ contentType: "image/png", sizeBytes: 1000 }),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
		expect(storage.presignedUploads).toHaveLength(0);
	});

	it("maps media policy violations to BAD_REQUEST with the domain error as cause", async () => {
		const { caller } = setup({ signedIn: true });

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
