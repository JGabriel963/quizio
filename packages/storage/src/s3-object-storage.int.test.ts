import {
	CreateBucketCommand,
	HeadBucketCommand,
	HeadObjectCommand,
	PutObjectCommand,
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

function clientFor() {
	return new S3Client({
		endpoint: config.endpoint,
		region: config.region,
		forcePathStyle: true,
		credentials: {
			accessKeyId: config.accessKeyId,
			secretAccessKey: config.secretAccessKey,
		},
	});
}

async function ensureBucket() {
	const client = clientFor();
	try {
		await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
	} catch {
		await client.send(new CreateBucketCommand({ Bucket: config.bucket }));
	}
}

describe("S3ObjectStorage against a real S3 server", () => {
	const storage = createS3ObjectStorage(config);

	beforeAll(ensureBucket);

	it("put writes an object that read and exists see (spec 044, RN-24)", async () => {
		const key = `media/int-test/${crypto.randomUUID()}.png`;
		const body = new Uint8Array(128).fill(3);

		await storage.put(key, body, "image/png");

		expect(await storage.exists(key)).toBe(true);
		expect(await storage.read(key)).toEqual(body);
		const head = await clientFor().send(
			new HeadObjectCommand({ Bucket: config.bucket, Key: key }),
		);
		expect(head.ContentType).toBe("image/png");
		await storage.delete(key);
	});

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

	it("an upload with Content-Disposition is served with it (spec 036)", async () => {
		const key = `groups/int-test/${crypto.randomUUID()}.pdf`;
		const body = new Uint8Array(64).fill(1);
		const disposition = "inline; filename*=UTF-8''apostila%20A.pdf";
		const upload = await storage.createPresignedUpload({
			key,
			contentType: "application/pdf",
			contentLength: body.byteLength,
			expiresInSeconds: 60,
			contentDisposition: disposition,
		});

		const response = await fetch(upload.url, {
			method: upload.method,
			headers: upload.headers,
			body,
		});

		expect(response.status).toBe(200);
		const head = await clientFor().send(
			new HeadObjectCommand({ Bucket: config.bucket, Key: key }),
		);
		expect(head.ContentDisposition).toBe(disposition);
		await storage.delete(key);
	});

	it("copies an object so deleting the copy keeps the original", async () => {
		const original = `media/int-test/${crypto.randomUUID()}.png`;
		const copy = `media/int-test/${crypto.randomUUID()}.png`;
		const body = new Uint8Array(128).fill(3);
		const upload = await storage.createPresignedUpload({
			key: original,
			contentType: "image/png",
			contentLength: body.byteLength,
			expiresInSeconds: 60,
		});
		await fetch(upload.url, {
			method: upload.method,
			headers: upload.headers,
			body,
		});

		await storage.copy(original, copy);
		expect(await storage.exists(copy)).toBe(true);

		await storage.delete(copy);
		expect(await storage.exists(copy)).toBe(false);
		expect(await storage.exists(original)).toBe(true);

		await storage.delete(original);
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

	it("reads back an uploaded object", async () => {
		const key = `sources/int-test/${crypto.randomUUID()}.pdf`;
		const body = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]);
		const upload = await storage.createPresignedUpload({
			key,
			contentType: "application/pdf",
			contentLength: body.byteLength,
			expiresInSeconds: 60,
		});
		await fetch(upload.url, {
			method: upload.method,
			headers: upload.headers,
			body,
		});

		expect(await storage.read(key)).toEqual(body);

		await storage.delete(key);
	});

	it("reads null for a missing key", async () => {
		expect(
			await storage.read(`sources/int-test/${crypto.randomUUID()}.pdf`),
		).toBeNull();
	});

	it("deletePrefix removes every object under the prefix and nothing else (spec 039)", async () => {
		const owner = crypto.randomUUID();
		const client = clientFor();
		const keys = [
			`media/${owner}/a.png`,
			`media/${owner}/b.png`,
			`media/${owner}/c.png`,
			`media/${owner}-other/d.png`,
		];
		for (const key of keys) {
			await client.send(
				new PutObjectCommand({
					Bucket: config.bucket,
					Key: key,
					Body: new Uint8Array([1]),
				}),
			);
		}

		await storage.deletePrefix(`media/${owner}/`);

		expect(await Promise.all(keys.map((key) => storage.exists(key)))).toEqual([
			false,
			false,
			false,
			true,
		]);
		await storage.delete(`media/${owner}-other/d.png`);
	});

	it("deletePrefix refuses a prefix that is not a folder", async () => {
		await expect(storage.deletePrefix("")).rejects.toThrow();
		await expect(storage.deletePrefix("media/abc")).rejects.toThrow();
	});
});
