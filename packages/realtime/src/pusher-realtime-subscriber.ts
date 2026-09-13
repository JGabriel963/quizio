import PusherClient from "pusher-js";

import type {
	RealtimeHandler,
	RealtimeSubscriber,
} from "./realtime-subscriber";

export interface PusherClientConfig {
	key: string;
	cluster: string;
	/** Set for self-hosted Pusher-protocol servers (Soketi); omit for Pusher cloud. */
	host?: string;
	port?: number;
	useTLS: boolean;
}

interface BindableChannel {
	bind(event: string, handler: RealtimeHandler<never>): unknown;
	unbind(event: string, handler: RealtimeHandler<never>): unknown;
}

export interface PusherSubscribeClient {
	subscribe(channel: string): BindableChannel;
	unsubscribe(channel: string): void;
	disconnect(): void;
}

export function createPusherClient(config: PusherClientConfig): PusherClient {
	if (!config.host) {
		return new PusherClient(config.key, {
			cluster: config.cluster,
			forceTLS: config.useTLS,
		});
	}
	return new PusherClient(config.key, {
		cluster: config.cluster,
		wsHost: config.host,
		wsPort: config.port,
		wssPort: config.port,
		forceTLS: config.useTLS,
		enabledTransports: ["ws", "wss"],
		disableStats: true,
	});
}

export function createPusherRealtimeSubscriber(
	config: PusherClientConfig,
	client: PusherSubscribeClient = createPusherClient(config),
): RealtimeSubscriber {
	// Several components may listen on one channel; only leave it when the last one unsubscribes.
	const listenersPerChannel = new Map<string, number>();

	return {
		subscribe(channelName, event, handler) {
			const channel = client.subscribe(channelName);
			channel.bind(event, handler as RealtimeHandler<never>);
			listenersPerChannel.set(
				channelName,
				(listenersPerChannel.get(channelName) ?? 0) + 1,
			);

			let active = true;
			return () => {
				if (!active) return;
				active = false;
				channel.unbind(event, handler as RealtimeHandler<never>);
				const remaining = (listenersPerChannel.get(channelName) ?? 1) - 1;
				if (remaining > 0) {
					listenersPerChannel.set(channelName, remaining);
				} else {
					listenersPerChannel.delete(channelName);
					client.unsubscribe(channelName);
				}
			};
		},

		disconnect() {
			listenersPerChannel.clear();
			client.disconnect();
		},
	};
}
