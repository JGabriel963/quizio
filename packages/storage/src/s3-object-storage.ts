import {
	DeleteObjectCommand,
	HeadObjectCommand,
	NotFound,
	PutObjectCommand,
	S3Client,
	S3ServiceException,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { ObjectStorage } from "@quizio/core/shared/application/ports/object-storage";

export interface S3ObjectStorageConfig {
	/** R2: `https://<account-id>.r2.cloudflarestorage.com`. Local: `http://localhost:9000`. */
	endpoint: string;
	/** R2 expects `auto`. */
	region: string;
	accessKeyId: string;
	secretAccessKey: string;
	bucket: string;
	/** Base URL objects are served from (R2 custom domain / r2.dev URL). */
	publicBaseUrl: string;
	/** Required by RustFS/MinIO-style servers; R2 works either way. */
	forcePathStyle: boolean;
}

/**
 * ObjectStorage adapter for any S3-compatible provider. Cloudflare R2 in
 * production; swapping providers is a config change, not a code change.
 */
export function createS3ObjectStorage(
	config: S3ObjectStorageConfig,
): ObjectStorage {
	const client = new S3Client({
		endpoint: config.endpoint,
		region: config.region,
		forcePathStyle: config.forcePathStyle,
		credentials: {
			accessKeyId: config.accessKeyId,
			secretAccessKey: config.secretAccessKey,
		},
		// Default CRC32 checksums end up in presigned URLs and break browser
		// uploads to R2; only send them when an operation requires it.
		requestChecksumCalculation: "WHEN_REQUIRED",
		responseChecksumValidation: "WHEN_REQUIRED",
	});
	const publicBaseUrl = config.publicBaseUrl.replace(/\/+$/, "");

	return {
		async createPresignedUpload({
			key,
			contentType,
			contentLength,
			expiresInSeconds,
		}) {
			const command = new PutObjectCommand({
				Bucket: config.bucket,
				Key: key,
				ContentType: contentType,
				ContentLength: contentLength,
			});
			const url = await getSignedUrl(client, command, {
				expiresIn: expiresInSeconds,
				// Signing content-length makes the provider reject bodies of any other size.
				signableHeaders: new Set(["content-type", "content-length"]),
			});
			// content-length is a forbidden header in browsers; they send it automatically.
			return { url, method: "PUT", headers: { "content-type": contentType } };
		},

		getPublicUrl(key) {
			return `${publicBaseUrl}/${key.split("/").map(encodeURIComponent).join("/")}`;
		},

		async exists(key) {
			try {
				await client.send(
					new HeadObjectCommand({ Bucket: config.bucket, Key: key }),
				);
				return true;
			} catch (error) {
				if (
					error instanceof NotFound ||
					(error instanceof S3ServiceException &&
						error.$metadata.httpStatusCode === 404)
				) {
					return false;
				}
				throw error;
			}
		},

		async delete(key) {
			await client.send(
				new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
			);
		},
	};
}
