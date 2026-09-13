import { describe, expect, it } from "vitest";

import {
	createS3ObjectStorage,
	type S3ObjectStorageConfig,
} from "./s3-object-storage";

const config: S3ObjectStorageConfig = {
	endpoint: "https://account.r2.cloudflarestorage.com",
	region: "auto",
	accessKeyId: "access",
	secretAccessKey: "secret",
	bucket: "quizio",
	publicBaseUrl: "https://media.quizio.test/",
	forcePathStyle: true,
};

describe("createS3ObjectStorage", () => {
	it("builds public URLs from the configured base, encoding each key segment", () => {
		const storage = createS3ObjectStorage(config);

		expect(storage.getPublicUrl("media/user 1/cover.png")).toBe(
			"https://media.quizio.test/media/user%201/cover.png",
		);
	});

	it("presigns a PUT that pins content type and length without checksum parameters", async () => {
		const storage = createS3ObjectStorage(config);

		const upload = await storage.createPresignedUpload({
			key: "media/user-1/cover.png",
			contentType: "image/png",
			contentLength: 1024,
			expiresInSeconds: 300,
		});
		const url = new URL(upload.url);

		expect(upload.method).toBe("PUT");
		expect(upload.headers).toEqual({ "content-type": "image/png" });
		expect(url.pathname).toBe("/quizio/media/user-1/cover.png");
		expect(url.searchParams.get("X-Amz-Expires")).toBe("300");
		expect(url.searchParams.get("X-Amz-SignedHeaders")).toBe(
			"content-length;content-type;host",
		);
		expect(
			[...url.searchParams.keys()].some((param) => param.includes("checksum")),
		).toBe(false);
	});
});
