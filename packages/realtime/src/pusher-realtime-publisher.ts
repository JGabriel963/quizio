import type {
	RealtimeMessage,
	RealtimePublisher,
} from "@quizio/core/shared/application/ports/realtime-publisher";
import Pusher from "pusher";

export interface PusherServerConfig {
	appId: string;
	key: string;
	secret: string;
	cluster: string;
	/** Set for self-hosted Pusher-protocol servers (Soketi); omit for Pusher cloud. */
	host?: string;
	port?: number;
	useTLS: boolean;
}

/** Pusher's HTTP API accepts at most 10 events per batch trigger. */
export const PUSHER_MAX_BATCH_SIZE = 10;

export type PusherTriggerClient = Pick<Pusher, "trigger" | "triggerBatch">;

export function createPusherServerClient(config: PusherServerConfig): Pusher {
	const credentials = {
		appId: config.appId,
		key: config.key,
		secret: config.secret,
		useTLS: config.useTLS,
	};
	return config.host
		? new Pusher({
				...credentials,
				host: config.host,
				port: config.port?.toString(),
			})
		: new Pusher({ ...credentials, cluster: config.cluster });
}

export function createPusherRealtimePublisher(
	config: PusherServerConfig,
	client: PusherTriggerClient = createPusherServerClient(config),
): RealtimePublisher {
	return {
		async publish({ channel, event, payload }: RealtimeMessage) {
			await client.trigger(channel, event, payload);
		},

		async publishMany(messages) {
			// Sequential batches keep event order stable for subscribers.
			for (
				let start = 0;
				start < messages.length;
				start += PUSHER_MAX_BATCH_SIZE
			) {
				const batch = messages.slice(start, start + PUSHER_MAX_BATCH_SIZE);
				await client.triggerBatch(
					batch.map(({ channel, event, payload }) => ({
						channel,
						name: event,
						data: payload,
					})),
				);
			}
		},
	};
}
