import { env } from "@quizio/env/server";
import { createPusherRealtimePublisher } from "@quizio/realtime/pusher-realtime-publisher";
import { createS3ObjectStorage } from "@quizio/storage/s3-object-storage";

import { type Adapters, type Container, createContainer } from "./container";

/**
 * The only place that knows which concrete provider backs each port.
 * Changing R2 → another S3 provider, or Pusher → another realtime service,
 * means changing an adapter here — use cases and routers stay untouched.
 */
export function createAdaptersFromEnv(): Adapters {
	return {
		storage: createS3ObjectStorage({
			endpoint: env.STORAGE_ENDPOINT,
			region: env.STORAGE_REGION,
			accessKeyId: env.STORAGE_ACCESS_KEY_ID,
			secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
			bucket: env.STORAGE_BUCKET,
			publicBaseUrl: env.STORAGE_PUBLIC_URL,
			forcePathStyle: env.STORAGE_FORCE_PATH_STYLE,
		}),
		realtime: createPusherRealtimePublisher({
			appId: env.PUSHER_APP_ID,
			key: env.PUSHER_KEY,
			secret: env.PUSHER_SECRET,
			cluster: env.PUSHER_CLUSTER,
			host: env.PUSHER_HOST,
			port: env.PUSHER_PORT,
			useTLS: env.PUSHER_USE_TLS,
		}),
		ids: { generate: () => crypto.randomUUID() },
		clock: { now: () => new Date() },
	};
}

let container: Container | undefined;

/** Lazily built once per server instance (one per warm serverless function). */
export function getContainer(): Container {
	container ??= createContainer(createAdaptersFromEnv());
	return container;
}
