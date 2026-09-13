// Idempotently prepares the bucket configured in apps/web/.env: creates it,
// allows browser uploads from the app origin (CORS) and, where the provider
// supports bucket policies, makes `media/*` publicly readable.
//
// Local (RustFS): run after `docker compose up`. Cloudflare R2: bucket and CORS
// work through this script too; public access must be enabled in the R2
// dashboard (custom domain or r2.dev) because R2 has no bucket policies.
import { fileURLToPath } from "node:url";
import {
	CreateBucketCommand,
	HeadBucketCommand,
	PutBucketCorsCommand,
	PutBucketPolicyCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { config } from "dotenv";

config({
	path: fileURLToPath(new URL("../../../apps/web/.env", import.meta.url)),
	quiet: true,
});

const required = (name) => {
	const value = process.env[name];
	if (!value) {
		console.error(`Missing ${name} in apps/web/.env`);
		process.exit(1);
	}
	return value;
};

const bucket = required("STORAGE_BUCKET");
const appOrigin = new URL(required("BETTER_AUTH_URL")).origin;
const client = new S3Client({
	endpoint: required("STORAGE_ENDPOINT"),
	region: process.env.STORAGE_REGION || "auto",
	forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === "true",
	credentials: {
		accessKeyId: required("STORAGE_ACCESS_KEY_ID"),
		secretAccessKey: required("STORAGE_SECRET_ACCESS_KEY"),
	},
});

try {
	await client.send(new HeadBucketCommand({ Bucket: bucket }));
	console.log(`✓ bucket "${bucket}" exists`);
} catch {
	await client.send(new CreateBucketCommand({ Bucket: bucket }));
	console.log(`✓ bucket "${bucket}" created`);
}

try {
	await client.send(
		new PutBucketCorsCommand({
			Bucket: bucket,
			CORSConfiguration: {
				CORSRules: [
					{
						AllowedOrigins: [appOrigin],
						AllowedMethods: ["PUT", "GET", "HEAD"],
						AllowedHeaders: ["*"],
						MaxAgeSeconds: 3600,
					},
				],
			},
		}),
	);
	console.log(`✓ CORS allows uploads from ${appOrigin}`);
} catch (error) {
	console.warn(
		`! could not set CORS (${error.name}); configure it in the provider dashboard`,
	);
}

try {
	await client.send(
		new PutBucketPolicyCommand({
			Bucket: bucket,
			Policy: JSON.stringify({
				Version: "2012-10-17",
				Statement: [
					{
						Effect: "Allow",
						Principal: { AWS: ["*"] },
						Action: ["s3:GetObject"],
						Resource: [`arn:aws:s3:::${bucket}/media/*`],
					},
				],
			}),
		}),
	);
	console.log("✓ media/* is publicly readable");
} catch (error) {
	console.warn(
		`! could not set a public-read policy (${error.name}); enable public access in the provider dashboard`,
	);
}
