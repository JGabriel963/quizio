import { env } from "@quizio/env/web";
import { createPusherRealtimeSubscriber } from "@quizio/realtime/pusher-realtime-subscriber";
import type { RealtimeSubscriber } from "@quizio/realtime/realtime-subscriber";

/** Client-side composition root for realtime: the only web file that knows about Pusher. */
export function createAppRealtimeSubscriber(): RealtimeSubscriber {
	return createPusherRealtimeSubscriber({
		key: env.VITE_PUSHER_KEY,
		cluster: env.VITE_PUSHER_CLUSTER,
		host: env.VITE_PUSHER_HOST,
		port: env.VITE_PUSHER_PORT,
		useTLS: env.VITE_PUSHER_USE_TLS,
	});
}
