import {
	CreateBucketCommand,
	HeadBucketCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { beforeAll, describe, expect, it } from "vitest";

import {
	createS3ObjectStorage,
	type S3ObjectStorageConfig,
} from "./s3-object-storage";

// Matches the `storage` service in docker-compose.yml.
const config: S3ObjectStorageConfig = {
	endpoint: process.env.TEST_STORAGE_ENDPOINT ?? "http://localhost:9000",
	region: "us-east-1",
	accessKeyId: process.env.TEST_STORAGE_ACCESS_KEY_ID ?? "quizio",
	secretAccessKey:
		process.env.TEST_STORAGE_SECRET_ACCESS_KEY ?? "quizio-secret",
	bucket: "quizio-test",
	publicBaseUrl: "http://localhost:9000/quizio-test",
	forcePathStyle: true,
};

async function ensureBucket() {
	const client = new S3Client({
		endpoint: config.endpoint,
		region: config.region,
		forcePathStyle: true,
		credentials: {
			accessKeyId: config.accessKeyId,
			secretAccessKey: config.secretAccessKey,
		},
	});
	try {
		await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
	} catch {
		await client.send(new CreateBucketCommand({ Bucket: config.bucket }));
	}
}

describe("S3ObjectStorage against a real S3 server", () => {
	const storage = createS3ObjectStorage(config);

	beforeAll(ensureBucket);

	it("uploads through a presigned URL, then reports and deletes the object", async () => {
		const key = `media/int-test/${crypto.randomUUID()}.png`;
		const body = new Uint8Array(256).fill(7);
		const upload = await storage.createPresignedUpload({
			key,
			contentType: "image/png",
			contentLength: body.byteLength,
			expiresInSeconds: 60,
		});

		const response = await fetch(upload.url, {
			method: upload.method,
			headers: upload.headers,
			body,
		});

		expect(response.status).toBe(200);
		expect(await storage.exists(key)).toBe(true);

		await storage.delete(key);
		expect(await storage.exists(key)).toBe(false);
	});

	it("rejects a body whose size differs from the signed content length", async () => {
		const key = `media/int-test/${crypto.randomUUID()}.png`;
		const upload = await storage.createPresignedUpload({
			key,
			contentType: "image/png",
			contentLength: 10,
			expiresInSeconds: 60,
		});

		const response = await fetch(upload.url, {
			method: upload.method,
			headers: upload.headers,
			body: new Uint8Array(4096),
		});

		expect(response.ok).toBe(false);
		expect(await storage.exists(key)).toBe(false);
	});
});
